import { Controller } from "@hotwired/stimulus"
import {
  normalizeFen,
  sideToMove,
  pieceColorAt,
  legalMoves,
  applyMove,
} from "@knight-school/chess-core"
import { createTrainingBoard, COLOR, CUSTOM_MARKER } from "../chess/board_factory"
import { playSound, getMoveSound, setSoundsEnabled } from "../chess/sound"
import { t } from "../i18n"

// Puzzles page controller — simpler cousin of training_controller.js: no
// timeline stepper, no hints, no opponent autoplay. Unlike Training, the
// solver's color can change from one puzzle to the next (whoever is to move
// in the fen), so enableMoveInput's color binding is re-applied on every
// loadNext() rather than fixed once at connect().
export default class extends Controller {
  static targets = [
    "host",
    "turn",
    "turnLabel",
    "flipIcon",
    "ratingChip",
    "status",
    "statusIcon",
    "statusMsg",
    "solvedStat",
    "streakStat",
    "skipButton",
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
    this.rating = this.ratingValue || ""

    this.isSubmitting = false
    this.solved = 0
    this.streak = 0
    this.bestStreak = 0
    this.feedback = ""
    this.lastBoardFen = null
    this.flipTurns = 0

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

  canPickUp(square) {
    if (this.isSubmitting || !this.puzzleId) return false
    return pieceColorAt(this.fen, square) === sideToMove(this.fen)
  }

  processMove(from, to) {
    if (this.isSubmitting || !this.puzzleId || from === to) return false

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
      })

      if (data.correct && data.puzzleComplete) {
        playSound("puzzleCorrect")
        this.feedback = `✅ ${t("puzzles.correct")}`
        this.solved += 1
        this.streak += 1
        this.bestStreak = Math.max(this.bestStreak, this.streak)
        this.render()
        window.setTimeout(() => void this.loadNext(), 1000)
        return
      }

      if (data.correct) {
        playSound("puzzleCorrect")
        this.feedback = `✅ ${t("puzzles.keepGoing")}`
        if (data.fenAfter) this.fen = data.fenAfter
        if (data.opponentReplyUci) this.lastMoveUci = data.opponentReplyUci
        if (data.nextCorrectMoveUci) this.correctMoveUci = data.nextCorrectMoveUci
        this.moveIndex += 1
        this.isSubmitting = false
        this.render()
        this.bindMoveInput()
        return
      }

      playSound("puzzleWrong")
      this.feedback = `❌ ${data.reason || t("puzzles.incorrectFallback")}`
      this.fen = preFen
      this.streak = 0
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

    try {
      const data = await this.getJson(this.nextUrlValue)
      this.puzzleId = data.puzzleId
      this.fen = normalizeFen(data.fen)
      this.rating = data.rating != null ? String(data.rating) : ""
      this.correctMoveUci = data.correctMoveUci || ""
      this.lastMoveUci = data.lastMoveUci || ""
      this.moveIndex = data.moveIndex || 0
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
    this.renderStats()

    if (this.hasSkipButtonTarget) this.skipButtonTarget.disabled = this.isSubmitting || !this.puzzleId
  }

  renderBoard() {
    if (!this.board) return
    const placement = this.fen.split(" ")[0]
    if (placement !== (this.lastBoardFen || "").split(" ")[0]) {
      void this.board.setPosition(this.fen, true)
    }
    this.lastBoardFen = this.fen

    this.board.removeMarkers(CUSTOM_MARKER.lastmove)
    if (this.lastMoveUci && this.lastMoveUci.length >= 4) {
      this.board.addMarker(CUSTOM_MARKER.lastmove, this.lastMoveUci.slice(0, 2))
      this.board.addMarker(CUSTOM_MARKER.lastmove, this.lastMoveUci.slice(2, 4))
    }
  }

  renderTurn() {
    const turn = sideToMove(this.fen)
    if (this.hasTurnTarget) this.turnTarget.classList.toggle("black", turn === "b")
    if (this.hasTurnLabelTarget) {
      this.turnLabelTarget.textContent = turn === "w" ? t("training.whiteToMove") : t("training.blackToMove")
    }
  }

  renderStatus() {
    const kind = this.feedback.startsWith("✅") ? "correct" : this.feedback.startsWith("❌") ? "incorrect" : "your"
    if (this.hasStatusTarget) this.statusTarget.className = `train-status ${kind}`
    if (this.hasStatusIconTarget) {
      this.statusIconTarget.textContent = kind === "correct" ? "✅" : kind === "incorrect" ? "❌" : "♟"
    }
    if (this.hasStatusMsgTarget) {
      const findBestMoveKey =
        sideToMove(this.fen) === "b" ? "puzzles.findBestMoveBlack" : "puzzles.findBestMoveWhite"
      this.statusMsgTarget.textContent = this.feedback || (this.puzzleId ? t(findBestMoveKey) : "")
    }
    if (this.hasRatingChipTarget) {
      this.ratingChipTarget.textContent = this.rating ? t("puzzles.rating", { rating: this.rating }) : ""
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
