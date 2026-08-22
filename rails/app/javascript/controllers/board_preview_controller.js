import { Controller } from "@hotwired/stimulus"
import { previewFen } from "@knight-school/chess-core"
import { createPreviewBoard } from "../chess/board_factory"

// Renders the dashboard's opening preview board and drives its ply-stepper
// and White/Black orientation toggle entirely client-side (no server round
// trip), using @knight-school/chess-core for FEN computation — the same
// package React's BoardPreview.tsx uses.
export default class extends Controller {
  static targets = ["host", "playerColorField"]
  static values = { epd: String, uciMoves: String, orientation: String, position: String, boardTheme: String, pieceSet: String }

  connect() {
    if (!this.hasHostTarget) return

    this.opening = { epd: this.epdValue || null, uci_moves: this.uciMovesValue || null }
    this.moveCount = this.opening.uci_moves ? this.opening.uci_moves.trim().split(/\s+/).length : 0
    this.board = createPreviewBoard(this.hostTarget, {
      position: this.positionValue || previewFen(this.opening, this.moveCount),
      orientation: this.orientationValue || "white",
      boardTheme: this.boardThemeValue || undefined,
      pieceSet: this.pieceSetValue || undefined,
    })
  }

  disconnect() {
    this.board?.destroy()
    this.board = null
  }

  setPly(event) {
    if (!this.board) return
    const ply = Number(event.currentTarget.dataset.ply)
    this.board.setPosition(previewFen(this.opening, ply), true)
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
