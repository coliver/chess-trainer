import { Controller } from "@hotwired/stimulus"
import { createPreviewBoard } from "../chess/board_factory"

// Renders one tiny static mate-position diagram on a theme picker card
// (see puzzles/themes.html.erb). Non-interactive, no move input.
export default class extends Controller {
  static values = { fen: String }

  connect() {
    this.board = createPreviewBoard(this.element, {
      position: this.fenValue,
      orientation: "white",
      showCoordinates: false,
    })
  }

  disconnect() {
    this.board?.destroy()
    this.board = null
  }
}
