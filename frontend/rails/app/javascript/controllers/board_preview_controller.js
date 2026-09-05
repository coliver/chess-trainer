import { Controller } from "@hotwired/stimulus"
import { previewFen, legalMoves, applyMove } from "@knight-school/chess-core"
import { createPreviewBoard } from "../chess/board_factory"
import { playSound, getMoveSound } from "../chess/sound"

// Renders the dashboard's opening preview board and drives its ply-stepper
// and White/Black orientation toggle entirely client-side (no server round
// trip), using @knight-school/chess-core for FEN computation — the same
// package React's BoardPreview.tsx uses. When interactiveValue is set (the
// Settings page's preview board), it also accepts free-play move input and
// plays a move sound, matching React's Settings.tsx previewOnMove.
export default class extends Controller {
  static targets = ["host", "playerColorField"]
  static values = { epd: String, uciMoves: String, orientation: String, position: String, boardTheme: String, pieceSet: String, showCoordinates: Boolean, interactive: Boolean }

  connect() {
    if (!this.hasHostTarget) return

    this.opening = { epd: this.epdValue || null, uci_moves: this.uciMovesValue || null }
    this.moveCount = this.opening.uci_moves ? this.opening.uci_moves.trim().split(/\s+/).length : 0
    this.fen = this.positionValue || previewFen(this.opening, this.moveCount)
    this.board = createPreviewBoard(this.hostTarget, {
      position: this.fen,
      orientation: this.orientationValue || "white",
      boardTheme: this.boardThemeValue || undefined,
      pieceSet: this.pieceSetValue || undefined,
      showCoordinates: this.showCoordinatesValue,
    })

    if (this.interactiveValue) {
      this.board.enableMoveInput(this.handleMoveInput.bind(this))
    }
  }

  disconnect() {
    this.board?.destroy()
    this.board = null
  }

  handleMoveInput(event) {
    switch (event.type) {
      case "moveInputStarted": {
        const from = event.squareFrom ?? ""
        this.board.addLegalMovesMarkers(legalMoves(this.fen, from))
        return true
      }
      case "validateMoveInput": {
        this.board.removeLegalMovesMarkers()
        const from = event.squareFrom ?? ""
        const to = event.squareTo ?? ""
        if (!from || !to || from === to) return false

        const result = applyMove(this.fen, from, to, `${from}${to}q`)
        if (!result) return false

        playSound(getMoveSound(this.fen, result.uci))
        this.fen = result.nextFen
        return true
      }
      case "moveInputCanceled":
      case "moveInputFinished":
        this.board.removeLegalMovesMarkers()
        return
      default:
        return
    }
  }

  setPly(event) {
    if (!this.board) return
    const ply = Number(event.currentTarget.dataset.ply)
    this.fen = previewFen(this.opening, ply)
    this.board.setPosition(this.fen, true)
    this.element.querySelectorAll(".ply-btn").forEach((btn) => {
      btn.classList.toggle("active", btn === event.currentTarget)
    })
  }

  playWhite(event) {
    this.applyOrientation("white", event.currentTarget)
  }

  playBlack(event) {
    this.applyOrientation("black", event.currentTarget)
  }

  applyOrientation(orientation, activeBtn) {
    this.board?.setOrientation(orientation === "black" ? "b" : "w")
    if (this.hasPlayerColorFieldTarget) {
      this.playerColorFieldTarget.value = orientation === "black" ? "b" : "w"
    }
    this.element.querySelectorAll(".ob-color-btn").forEach((btn) => {
      const selected = btn === activeBtn
      btn.classList.toggle("selected", selected)
      btn.setAttribute("aria-checked", String(selected))
    })
  }
}
