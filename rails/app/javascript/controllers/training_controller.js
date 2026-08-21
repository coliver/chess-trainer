import { Controller } from "@hotwired/stimulus"
import {
  START_FEN,
  normalizeFen,
  sideToMove,
  pieceColorAt,
  legalMoves,
  applyMove,
  applyUci,
  createTimeline,
  appendTimelineFen,
  jumpToIndex,
  isAtLatest,
  deriveStatus,
} from "@knight-school/chess-core"
import { createTrainingBoard, COLOR, ARROW_TYPE, CUSTOM_MARKER } from "../chess/board_factory"
import { playSound, getMoveSound } from "../chess/sound"

// Fused controller for the Training page — combines the roles React splits
// across Board.tsx + Training.tsx + useTrainingSession.ts. cm-chessboard's
// validateMoveInput needs a synchronous return value, so board construction,
// move submission, timeline stepping, and hint escalation all live here
// rather than being split across cooperating controllers.
export default class extends Controller {
  static targets = [
    "host",
    "turn",
    "turnLabel",
    "hintButton",
    "flipIcon",
    "openingName",
    "ecoChip",
    "status",
    "statusIcon",
    "statusMsg",
    "statusSub",
    "inProgressControls",
    "completedControls",
    "prevButton",
    "nextButton",
    "moveInput",
    "playButton",
    "exitButton",
  ]

  static values = {
    trainingId: String,
    fen: String,
    itemId: String,
    correctMoveUci: String,
    playerColor: String,
    eco: String,
    openingName: String,
    nextUrl: String,
    movesUrl: String,
    dashboardUrl: String,
  }

  connect() {
    this.fen = normalizeFen(this.fenValue || START_FEN)
    this.itemId = this.itemIdValue || null
    this.correctMoveUci = this.correctMoveUciValue || ""
    this.playerColor = this.playerColorValue === "b" ? "b" : "w"
    this.openingLabel = this.openingNameValue || "Training"
    this.eco = this.ecoValue || ""

    this.timeline = createTimeline(this.fen)
    this.isSubmitting = false
    this.isAdvancing = false
    this.isSessionCompleted = false
    this.hintLevel = -1
    this.wrongAttempts = 0
    this.lastMove = null
    this.pendingMove = null
    this.feedback = ""
    this.autoplayedItemId = null
    this.flipTurns = 0
    this.lastBoardFen = null

    this.orientation = this.playerColor === "b" ? "black" : "white"

    this.board = createTrainingBoard(this.hostTarget, {
      position: this.fen,
      orientation: this.orientation,
    })
    this.board.enableMoveInput(
      this.handleMoveInput.bind(this),
      this.playerColor === "b" ? COLOR.black : COLOR.white,
    )
    this.lastBoardFen = this.fen

    playSound("gameStart")
    this.render()
    this.maybeAutoplay()
  }

  disconnect() {
    this.board?.destroy()
    this.board = null
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
        const from = event.squareFrom ?? ""
        const to = event.squareTo ?? ""
        const ownPrefix = this.playerColor === "b" ? "b" : "w"
        if (this.board.getPiece(to)?.startsWith(ownPrefix)) return false
        return this.processMove(from, to)
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
    if (!isAtLatest(this.timeline)) return false
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false
    if (sideToMove(this.fen) !== this.playerColor) return false
    return pieceColorAt(this.fen, square) === this.playerColor
  }

  processMove(from, to) {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false
    if (!from || !to || from === to) return false

    const preFen = this.fen
    const result = applyMove(preFen, from, to, this.correctMoveUci)
    if (!result) {
      playSound("illegal")
      this.feedback = "❌ Illegal move"
      this.render()
      return false
    }

    this.fen = result.nextFen
    this.timeline = appendTimelineFen(this.timeline, result.nextFen)
    this.pendingMove = { from, to }
    this.feedback = ""

    playSound(getMoveSound(preFen, result.uci))
    this.render()
    void this.submitMove(result.uci, preFen)
    return true
  }

  // --- server round trips ---------------------------------------------------

  async submitMove(moveUci, preFen, options = {}) {
    const silent = options.silent ?? false
    if (!this.trainingIdValue || this.itemId == null) return

    const prevItemId = this.itemId
    this.isSubmitting = true
    this.render()

    try {
      const data = await this.postJson(this.movesUrlValue, {
        move_uci: moveUci,
        item_id: this.itemId,
      })

      if (data.correct) {
        if (!silent) {
          playSound("correct")
          this.feedback = "✅ Correct!"
          this.hintLevel = -1
          this.wrongAttempts = 0
          if (this.pendingMove) {
            this.lastMove = this.pendingMove
            this.pendingMove = null
          }
        }

        if (data.fenAfter) this.fen = normalizeFen(data.fenAfter)

        if (data.sessionCompleted) {
          playSound("achievement")
          this.feedback = "✅ Session completed."
          this.isSessionCompleted = true
          this.isAdvancing = false
          this.isSubmitting = false
          this.render()
          return
        }

        this.isAdvancing = true
        this.render()

        window.setTimeout(async () => {
          try {
            const next = await this.fetchNextItem()
            if (next.itemId === prevItemId) {
              this.feedback = "✅ Opening complete."
              this.fen = next.fen
            } else {
              this.applyNextItem(next)
              this.feedback = ""
              this.isSessionCompleted = false
            }
          } catch (err) {
            this.feedback = "No more moves in this session or session expired."
          } finally {
            this.isAdvancing = false
            this.isSubmitting = false
            this.render()
            this.maybeAutoplay()
          }
        }, 500)
        return
      }

      // Incorrect but legal move — revert to the exact fen used to submit.
      playSound("incorrect")
      this.fen = preFen
      this.feedback = `❌ ${data.reason || "Incorrect move"}`
      this.wrongAttempts += 1
    } catch (err) {
      this.feedback =
        err.status === 404
          ? err.detail || "Session completed."
          : "Error submitting move"
    } finally {
      this.isSubmitting = false
      this.render()
    }
  }

  async fetchNextItem() {
    const data = await this.getJson(this.nextUrlValue)
    return {
      fen: normalizeFen(data.fen),
      itemId: data.itemId != null ? String(data.itemId) : null,
      openingName: data.openingName || "",
      eco: data.openingEco || "",
      correctMoveUci: data.correctMoveUci || "",
      playerColor: data.playerColor === "b" ? "b" : "w",
    }
  }

  applyNextItem(next) {
    this.itemId = next.itemId
    this.fen = next.fen
    this.correctMoveUci = next.correctMoveUci
    this.playerColor = next.playerColor
    if (next.openingName) this.openingLabel = next.openingName
    if (next.eco) this.eco = next.eco
    this.hintLevel = -1
    this.wrongAttempts = 0
    this.lastMove = null
    this.pendingMove = null
    this.timeline = createTimeline(this.fen)
  }

  // Opponent's scripted reply: when it isn't the player's turn, the current
  // item's correctMoveUci is the forced move to auto-play, not something to
  // wait on input for. Mirrors useTrainingSession's autoplay effect.
  maybeAutoplay() {
    if (
      !this.itemId ||
      this.isSubmitting ||
      this.isAdvancing ||
      !this.correctMoveUci ||
      this.isSessionCompleted
    ) {
      return
    }
    if (this.autoplayedItemId === this.itemId) return
    if (!isAtLatest(this.timeline)) return
    if (sideToMove(this.fen) === this.playerColor) return

    this.autoplayedItemId = this.itemId
    const uci = this.correctMoveUci
    const preFen = this.fen
    const applied = applyUci(preFen, uci)
    if (applied) {
      this.timeline = appendTimelineFen(this.timeline, applied.nextFen)
      this.lastMove = { from: uci.slice(0, 2), to: uci.slice(2, 4) }
      playSound("moveOpponent")
      this.render()
    }
    void this.submitMove(uci, preFen, { silent: true })
  }

  // --- stepper / hint / flip / exit actions ----------------------------------

  prev() {
    this.goToIndex(this.timeline.index - 1)
  }

  next() {
    this.goToIndex(this.timeline.index + 1)
  }

  goToIndex(nextIndex) {
    const next = jumpToIndex(this.timeline, nextIndex)
    if (next.index === this.timeline.index) return

    this.timeline = next
    this.fen = next.fens[next.index] ?? next.fens[0]
    this.feedback = ""
    this.hintLevel = -1
    this.pendingMove = null
    this.lastMove = null
    if (this.hasMoveInputTarget) this.moveInputTarget.value = ""
    this.render()
  }

  showHint() {
    if (this.isSubmitting || this.isAdvancing || !this.itemId || this.isSessionCompleted) return
    this.hintLevel = this.hintLevel < 0 ? 0 : 1
    this.render()
  }

  flip() {
    this.orientation = this.orientation === "black" ? "white" : "black"
    this.board?.setOrientation(this.orientation === "black" ? COLOR.black : COLOR.white)
    this.flipTurns += 1
    if (this.hasFlipIconTarget) {
      this.flipIconTarget.style.transform = `rotate(${this.flipTurns * 180}deg)`
    }
  }

  submitTyped(event) {
    event.preventDefault()
    if (!this.hasMoveInputTarget) return
    const uci = this.moveInputTarget.value.trim()
    if (!uci || this.isSubmitting || this.isAdvancing || !isAtLatest(this.timeline)) return

    this.feedback = ""
    void this.submitMove(uci, this.fen)
    this.moveInputTarget.value = ""
  }

  exit() {
    window.location.href = this.dashboardUrlValue
  }

  // --- rendering --------------------------------------------------------------

  render() {
    this.renderBoard()
    this.renderTurn()
    this.renderStatus()
    this.renderControls()
  }

  renderBoard() {
    if (!this.board) return
    const placement = this.fen.split(" ")[0]
    if (placement !== (this.lastBoardFen || "").split(" ")[0]) {
      void this.board.setPosition(this.fen, true)
    }
    this.lastBoardFen = this.fen

    this.board.removeMarkers(CUSTOM_MARKER.hint)
    this.board.removeMarkers(CUSTOM_MARKER.lastmove)
    this.board.removeArrows()

    if (this.lastMove) {
      this.board.addMarker(CUSTOM_MARKER.lastmove, this.lastMove.from)
      this.board.addMarker(CUSTOM_MARKER.lastmove, this.lastMove.to)
    }

    const effectiveHintLevel = Math.max(
      this.hintLevel,
      this.wrongAttempts >= 4 ? 1 : this.wrongAttempts >= 2 ? 0 : -1,
    )
    if (this.correctMoveUci && effectiveHintLevel >= 0 && !this.isSessionCompleted) {
      const from = this.correctMoveUci.slice(0, 2)
      const to = this.correctMoveUci.slice(2, 4)
      this.board.addMarker(CUSTOM_MARKER.hint, from)
      if (effectiveHintLevel >= 1) {
        this.board.addMarker(CUSTOM_MARKER.hint, to)
        this.board.addArrow(ARROW_TYPE.info, from, to)
      }
    }
  }

  renderTurn() {
    const turn = sideToMove(this.fen)
    if (this.hasTurnTarget) this.turnTarget.classList.toggle("black", turn === "b")
    if (this.hasTurnLabelTarget) {
      this.turnLabelTarget.textContent = turn === "w" ? "White to move" : "Black to move"
    }
  }

  renderStatus() {
    const isPlayerToMove = sideToMove(this.fen) === this.playerColor
    const status = deriveStatus({
      isSessionCompleted: this.isSessionCompleted,
      feedback: this.feedback,
      hintLevel: this.hintLevel,
      isPlayerToMove,
      playerColor: this.playerColor,
    })

    if (this.hasStatusTarget) {
      this.statusTarget.className = `train-status ${status.kind}`
    }
    if (this.hasStatusIconTarget) this.statusIconTarget.textContent = status.icon
    if (this.hasStatusMsgTarget) this.statusMsgTarget.textContent = status.message
    if (this.hasStatusSubTarget) this.statusSubTarget.textContent = status.sub

    if (this.hasOpeningNameTarget) this.openingNameTarget.textContent = this.openingLabel
    if (this.hasEcoChipTarget) this.ecoChipTarget.textContent = this.eco
  }

  renderControls() {
    const busy = this.isSubmitting || this.isAdvancing
    const atLatest = isAtLatest(this.timeline)

    if (this.hasHintButtonTarget) {
      this.hintButtonTarget.disabled = busy || !this.itemId || this.isSessionCompleted
    }
    if (this.hasPrevButtonTarget) {
      this.prevButtonTarget.disabled = busy || this.timeline.index <= 0
    }
    if (this.hasNextButtonTarget) {
      this.nextButtonTarget.disabled = busy || this.timeline.index >= this.timeline.fens.length - 1
    }
    if (this.hasMoveInputTarget) this.moveInputTarget.disabled = this.isSubmitting
    if (this.hasPlayButtonTarget) this.playButtonTarget.disabled = busy || !atLatest

    if (this.hasInProgressControlsTarget) this.inProgressControlsTarget.hidden = this.isSessionCompleted
    if (this.hasCompletedControlsTarget) this.completedControlsTarget.hidden = !this.isSessionCompleted
    if (this.hasExitButtonTarget) this.exitButtonTarget.hidden = this.isSessionCompleted
  }

  // --- fetch helpers ------------------------------------------------------

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
