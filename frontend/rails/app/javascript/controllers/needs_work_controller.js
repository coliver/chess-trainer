import { Controller } from "@hotwired/stimulus"

// Expand/collapse toggle for the dashboard's "needs work" weak-spots /
// trouble-moves section — the client-side equivalent of React's
// needsWorkExpanded state (Dashboard.tsx).
export default class extends Controller {
  static targets = ["toggleBtn", "panel"]

  toggle() {
    const expanded = this.panelTarget.hidden
    this.panelTarget.hidden = !expanded
    this.toggleBtnTarget.setAttribute("aria-expanded", String(expanded))
    this.toggleBtnTarget.textContent = expanded
      ? this.toggleBtnTarget.dataset.expandedLabel
      : this.toggleBtnTarget.dataset.collapsedLabel
  }
}
