import { Controller } from "@hotwired/stimulus"
import { previewFen } from "@knight-school/chess-core"
import { createPreviewBoard } from "../chess/board_factory"

// Renders a base-opening card's thumbnail (final position of its
// representative line), mounted lazily via IntersectionObserver so a grid
// of ~150 cards doesn't spin up 150 boards at once — mirrors React's
// OpeningCard.tsx.
export default class extends Controller {
  static targets = ["host"]
  static values = { epd: String, uciMoves: String, orientation: String }

  connect() {
    if (!this.hasHostTarget) return

    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) this.mount()
    }, { rootMargin: "250px" })
    this.observer.observe(this.element)
  }

  disconnect() {
    this.observer?.disconnect()
    this.board?.destroy()
    this.board = null
  }

  mount() {
    this.observer.disconnect()
    const opening = { epd: this.epdValue || null, uci_moves: this.uciMovesValue || null }
    const moveCount = opening.uci_moves ? opening.uci_moves.trim().split(/\s+/).length : 0
    this.board = createPreviewBoard(this.hostTarget, {
      position: previewFen(opening, moveCount),
      orientation: this.orientationValue || "white",
    })
  }
}
