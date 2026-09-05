import { Controller } from "@hotwired/stimulus"
import {
  normalizeFen,
  sideToMove,
  pieceColorAt,
  legalMoves,
  applyMove,
  deriveHintMarkers,
} from "@knight-school/chess-core"
import { createTrainingBoard, COLOR, ARROW_TYPE, CUSTOM_MARKER } from "../chess/board_factory"
import { playSound, getMoveSound, setSoundsEnabled } from "../chess/sound"
import { t } from "../i18n"

// "backRankMate" -> "back Rank Mate" — mirrors react/src/utils/puzzleThemes.ts
// and app/services/puzzle_theme_grouping.rb's format_label.
const formatThemeLabel = (theme) => theme.replace(/([a-z0-9])([A-Z])/g, "$1 $2")

// Puzzles page controller — simpler cousin of training_controller.js: no
// intra-puzzle timeline stepper, no opponent autoplay. Unlike Training, the
// solver's color can change from one puzzle to the next (whoever is to move
// in the fen), so enableMoveInput's color binding is re-applied on every
// loadNext() rather than fixed once at connect().
//
// `history`/`historyIndex` mirror react/src/pages/Puzzles.tsx's session-local
// prev/next stepping: every puzzle seen this session (starting with the one
// the server rendered) is kept read-only-replayable, while only the frontier
// entry (historyIndex === history.length - 1) is live/interactive.
export default class extends Controller {
  static targets = [
    "host",
    "turn",
    "turnLabel",
    "flipIcon",
    "ratingChip",
    "moveProgressChip",
    "themesRow",
    "status",
    "statusIcon",
    "statusMsg",
    "solvedStat",
    "streakStat",
    "skipButton",
    "hintButton",
    "prevButton",
    "nextButton",
    "noPuzzleBox",
  ]

  static values = {
    puzzleId: String,
    fen: String,
    rating: String,
    correctMoveUci: String,
    lastMoveUci: String,
    moveIndex: Number,
    solverMovesTotal: Number,
    themes: String,
    nextUrl: String,
    attemptsUrlTemplate: String,
    dashboardUrl: String,
    boardTheme: String,
    pieceSet: String,
    showCoordinates: String,
    boardAnimations: String,
    boardOrientationMode: String,
    soundEnabled: String,
  }

  connect() {
    this.fen = normalizeFen(this.fenValue)
    this.puzzleId = this.puzzleIdValue || null
    this.correctMoveUci = this.correctMoveUciValue || ""
    this.lastMoveUci = this.lastMoveUciValue || ""
    this.moveIndex = this.moveIndexValue || 0
    this.solverMovesTotal = this.solverMovesTotalValue || 1
    this.themes = this.themesValue || ""
    this.rating = this.ratingValue || ""

    this.isSubmitting = false
    this.solved = 0
    this.streak = 0
    this.bestStreak = 0
    this.feedback = ""
    this.lastBoardFen = null
    this.flipTurns = 0
    this.puzzleComplete = false
    this.hintLevel = -1
    this.wrongAttempts = 0
    this.usedHint = false

    this.history = [
      {
        puzzleId: this.puzzleId,
        fen: this.fen,
        rating: this.rating,
        correctMoveUci: this.correctMoveUci,
        moveIndex: this.moveIndex,
        solverMovesTotal: this.solverMovesTotal,
        themes: this.themes,
        finalFen: this.fen,
        finalLastMoveUci: this.lastMoveUci,
      },
    ]
    this.historyIndex = 0

    setSoundsEnabled(this.soundEnabledValue !== "false")

    this.orientation = this.orientationFor(this.fen)

    this.board = createTrainingBoard(this.hostTarget, {
      position: this.fen,
      orientation: this.orientation,
      boardTheme: this.boardThemeValue || undefined,
      pieceSet: this.pieceSetValue || undefined,
      showCoordinates: this.showCoordinatesValue !== "false",
      animated: this.boardAnimationsValue !== "false",
    })
    this.lastBoardFen = this.fen
    this.bindMoveInput()

    playSound("gameStart")
    this.render()
  }

  disconnect() {
    this.board?.destroy()
    this.board = null
  }

  orientationFor(fen) {
    const mode = this.boardOrientationModeValue || "auto"
    if (mode === "white") return "white"
    if (mode === "black") return "black"
    return sideToMove(fen) === "b" ? "black" : "white"
  }

  bindMoveInput() {
    const solverColor = sideToMove(this.fen)
    this.board.enableMoveInput(
      this.handleMoveInput.bind(this),
      solverColor === "b" ? COLOR.black : COLOR.white,
    )
  }

  // --- cm-chessboard move input -------------------------------------------

  handleMoveInput(event) {
    switch (event.type) {
      case "moveInputStarted": {
        const from = event.squareFrom ?? ""
        const allowed = this.canPickUp(from)
        if (allowed) {
          this.board.removeLegalMovesMarkers()
          this.board.addLegalMovesMarkers(legalMoves(this.fen, from))
        }
        return allowed
      }
      case "validateMoveInput": {
        this.board.removeLegalMovesMarkers()
        return this.processMove(event.squareFrom ?? "", event.squareTo ?? "")
      }
      case "moveInputCanceled":
      case "moveInputFinished":
        this.board.removeLegalMovesMarkers()
        return
      default:
        return
    }
  }

  isViewingPast() {
    return this.historyIndex < this.history.length - 1
  }

  canPickUp(square) {
    if (this.isSubmitting || !this.puzzleId || this.isViewingPast()) return false
    return pieceColorAt(this.fen, square) === sideToMove(this.fen)
  }

  processMove(from, to) {
    if (this.isSubmitting || !this.puzzleId || this.isViewingPast() || from === to) return false

    const preFen = this.fen
    const result = applyMove(preFen, from, to, this.correctMoveUci)
    if (!result) {
      playSound("illegal")
      return false
    }

    this.fen = result.nextFen
    this.feedback = ""
    playSound(getMoveSound(preFen, result.uci))
    this.render()
    void this.submitAttempt(result.uci, preFen)
    return true
  }

  // --- server round trips ---------------------------------------------------

  async submitAttempt(moveUci, preFen) {
    if (!this.puzzleId) return

    this.isSubmitting = true
    this.render()

    try {
      const data = await this.postJson(this.attemptsUrl(this.puzzleId), {
        move_uci: moveUci,
        move_index: this.moveIndex,
        used_hint: this.usedHint,
      })

      if (data.correct && data.puzzleComplete) {
        playSound("puzzleCorrect")
        this.feedback = `✅ ${t("puzzles.correct")}`
        this.solved += 1
        this.streak += 1
        this.bestStreak = Math.max(this.bestStreak, this.streak)
        this.puzzleComplete = true
        this.isSubmitting = false
        const last = this.history[this.history.length - 1]
        this.history[this.history.length - 1] = {
          ...last,
          moveIndex: this.moveIndex,
          finalFen: this.fen,
          finalLastMoveUci: moveUci,
        }
        this.render()
        return
      }

      if (data.correct) {
        playSound("puzzleCorrect")
        this.feedback = `✅ ${t("puzzles.keepGoing")}`
        if (data.fenAfter) this.fen = data.fenAfter
        if (data.opponentReplyUci) this.lastMoveUci = data.opponentReplyUci
        if (data.nextCorrectMoveUci) this.correctMoveUci = data.nextCorrectMoveUci
        this.moveIndex += 1
        this.hintLevel = -1
        this.wrongAttempts = 0
        this.isSubmitting = false
        this.render()
        this.bindMoveInput()
        return
      }

      playSound("puzzleWrong")
      this.feedback = `❌ ${data.reason || t("puzzles.incorrectFallback")}`
      this.fen = preFen
      this.streak = 0
      this.wrongAttempts += 1
      this.isSubmitting = false
      this.render()
      this.bindMoveInput()
    } catch (err) {
      this.feedback = err.detail || t("puzzles.submitError")
      this.isSubmitting = false
      this.render()
    }
  }

  async loadNext() {
    this.feedback = ""
    this.puzzleComplete = false
    this.hintLevel = -1
    this.wrongAttempts = 0
    this.usedHint = false

    try {
      const data = await this.getJson(this.nextUrlValue)
      this.puzzleId = data.puzzleId
      this.fen = normalizeFen(data.fen)
      this.rating = data.rating != null ? String(data.rating) : ""
      this.correctMoveUci = data.correctMoveUci || ""
      this.lastMoveUci = data.lastMoveUci || ""
      this.moveIndex = data.moveIndex || 0
      this.solverMovesTotal = data.solverMovesTotal || 1
      this.themes = data.themes || ""
      this.history.push({
        puzzleId: this.puzzleId,
        fen: this.fen,
        rating: this.rating,
        correctMoveUci: this.correctMoveUci,
        moveIndex: this.moveIndex,
        solverMovesTotal: this.solverMovesTotal,
        themes: this.themes,
        finalFen: this.fen,
        finalLastMoveUci: this.lastMoveUci,
      })
      this.historyIndex = this.history.length - 1
      this.orientation = this.orientationFor(this.fen)
      this.board?.setOrientation(this.orientation === "black" ? COLOR.black : COLOR.white)
      this.isSubmitting = false
      this.render()
      this.bindMoveInput()
    } catch (err) {
      if (err.status === 404) {
        this.puzzleId = null
        this.lastMoveUci = ""
        if (this.hasNoPuzzleBoxTarget) this.noPuzzleBoxTarget.hidden = false
        this.feedback = t("puzzles.noPuzzlesDue")
      } else {
        this.feedback = t("puzzles.loadFailed")
      }
      this.isSubmitting = false
      this.render()
    }
  }

  skip() {
    if (!this.puzzleId || this.isSubmitting) return
    this.streak = 0
    void this.loadNext()
  }

  showHint() {
    if (this.isViewingPast() || this.isSubmitting || !this.puzzleId || this.puzzleComplete) return
    this.usedHint = true
    this.hintLevel = this.hintLevel < 0 ? 0 : 1
    this.render()
  }

  prev() {
    this.historyIndex = Math.max(0, this.historyIndex - 1)
    this.render()
  }

  next() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex += 1
      this.render()
    } else {
      void this.loadNext()
    }
  }

  currentEntry() {
    return this.history[this.historyIndex]
  }

  effectiveHintLevel() {
    return Math.max(this.hintLevel, this.wrongAttempts >= 4 ? 1 : this.wrongAttempts >= 2 ? 0 : -1)
  }

  flip() {
    this.orientation = this.orientation === "black" ? "white" : "black"
    this.board?.setOrientation(this.orientation === "black" ? COLOR.black : COLOR.white)
    this.flipTurns += 1
    if (this.hasFlipIconTarget) {
      this.flipIconTarget.style.transform = `rotate(${this.flipTurns * 180}deg)`
    }
  }

  // --- rendering --------------------------------------------------------------

  render() {
    this.renderBoard()
    this.renderTurn()
    this.renderStatus()
    this.renderMeta()
    this.renderStats()
    this.renderControls()
  }

  renderControls() {
    const viewingPast = this.isViewingPast()
    if (this.hasSkipButtonTarget) {
      this.skipButtonTarget.hidden = !this.puzzleId || this.puzzleComplete
      this.skipButtonTarget.disabled = this.isSubmitting
    }
    if (this.hasHintButtonTarget) {
      this.hintButtonTarget.hidden = viewingPast
      this.hintButtonTarget.disabled = this.isSubmitting || !this.puzzleId || this.puzzleComplete
    }
    if (this.hasPrevButtonTarget) this.prevButtonTarget.hidden = this.historyIndex <= 0
    if (this.hasNextButtonTarget) {
      this.nextButtonTarget.hidden = !((this.puzzleId && this.puzzleComplete) || viewingPast)
    }
  }

  renderBoard() {
    if (!this.board) return
    const viewingPast = this.isViewingPast()
    const entry = this.currentEntry()
    const position = viewingPast ? entry.finalFen : this.fen
    const lastMoveUci = viewingPast ? entry.finalLastMoveUci : this.lastMoveUci

    const placement = position.split(" ")[0]
    if (placement !== (this.lastBoardFen || "").split(" ")[0]) {
      void this.board.setPosition(position, true)
    }
    this.lastBoardFen = position

    this.board.removeMarkers(CUSTOM_MARKER.lastmove)
    this.board.removeMarkers(CUSTOM_MARKER.hint)
    this.board.removeArrows()

    if (lastMoveUci && lastMoveUci.length >= 4) {
      this.board.addMarker(CUSTOM_MARKER.lastmove, lastMoveUci.slice(0, 2))
      this.board.addMarker(CUSTOM_MARKER.lastmove, lastMoveUci.slice(2, 4))
    }

    if (!viewingPast) {
      const hint = deriveHintMarkers(this.correctMoveUci, this.effectiveHintLevel(), this.puzzleComplete)
      if (hint) {
        this.board.addMarker(CUSTOM_MARKER.hint, hint.from)
        if (hint.to) {
          this.board.addMarker(CUSTOM_MARKER.hint, hint.to)
          this.board.addArrow(ARROW_TYPE.info, hint.from, hint.to)
        }
      }
    }
  }

  renderTurn() {
    const turn = sideToMove(this.isViewingPast() ? this.currentEntry().fen : this.fen)
    if (this.hasTurnTarget) this.turnTarget.classList.toggle("black", turn === "b")
    if (this.hasTurnLabelTarget) {
      this.turnLabelTarget.textContent = turn === "w" ? t("training.whiteToMove") : t("training.blackToMove")
    }
  }

  renderStatus() {
    const viewingPast = this.isViewingPast()
    const feedback = viewingPast ? "" : this.feedback
    const kind = feedback.startsWith("✅") ? "correct" : feedback.startsWith("❌") ? "incorrect" : "your"
    if (this.hasStatusTarget) this.statusTarget.className = `train-status ${kind}`
    if (this.hasStatusIconTarget) {
      this.statusIconTarget.textContent = kind === "correct" ? "✅" : kind === "incorrect" ? "❌" : "♟"
    }
    if (this.hasStatusMsgTarget) {
      const findBestMoveKey =
        sideToMove(this.fen) === "b" ? "puzzles.findBestMoveBlack" : "puzzles.findBestMoveWhite"
      this.statusMsgTarget.textContent = feedback || (!viewingPast && this.puzzleId ? t(findBestMoveKey) : "")
    }
    if (this.hasRatingChipTarget) {
      const rating = viewingPast ? this.currentEntry().rating : this.rating
      this.ratingChipTarget.textContent = rating ? t("puzzles.rating", { rating }) : ""
    }
  }

  renderMeta() {
    const viewingPast = this.isViewingPast()
    const entry = this.currentEntry()
    const moveIndex = viewingPast ? (entry.moveIndex ?? 0) : this.moveIndex
    const solverMovesTotal = viewingPast ? (entry.solverMovesTotal ?? 1) : this.solverMovesTotal
    const themes = viewingPast ? (entry.themes ?? "") : this.themes

    if (this.hasMoveProgressChipTarget) {
      this.moveProgressChipTarget.hidden = solverMovesTotal <= 1
      this.moveProgressChipTarget.textContent =
        solverMovesTotal > 1 ? t("puzzles.moveProgress", { current: moveIndex + 1, total: solverMovesTotal }) : ""
    }

    if (this.hasThemesRowTarget) {
      const labels = (themes || "").split(" ").filter(Boolean).map(formatThemeLabel)
      this.themesRowTarget.innerHTML = ""
      this.themesRowTarget.hidden = labels.length === 0
      for (const label of labels) {
        const chip = document.createElement("span")
        chip.className = "puzzles-theme-chip"
        chip.textContent = label
        this.themesRowTarget.appendChild(chip)
      }
    }
  }

  renderStats() {
    if (this.hasSolvedStatTarget) {
      this.solvedStatTarget.textContent = t("puzzles.solved", { count: this.solved })
    }
    if (this.hasStreakStatTarget) {
      let streakText = t("puzzles.streak", { count: this.streak })
      if (this.streak > 0) streakText += " 🔥"
      if (this.bestStreak > 0) streakText += t("puzzles.streakBest", { best: this.bestStreak })
      this.streakStatTarget.textContent = streakText
      this.streakStatTarget.classList.toggle("is-active", this.streak > 0)
    }
  }

  // --- fetch helpers ------------------------------------------------------

  attemptsUrl(id) {
    return this.attemptsUrlTemplateValue.replace("__ID__", id)
  }

  csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || ""
  }

  async getJson(url) {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-CSRF-Token": this.csrfToken() },
    })
    return this.parseJsonResponse(res)
  }

  async postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken(),
      },
      body: JSON.stringify(body),
    })
    return this.parseJsonResponse(res)
  }

  async parseJsonResponse(res) {
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (!res.ok) {
      const err = new Error((data && data.detail) || `Request failed (${res.status})`)
      err.status = res.status
      err.detail = data && data.detail
      throw err
    }
    return data || {}
  }
}
