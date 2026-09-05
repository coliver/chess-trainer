import { Controller } from "@hotwired/stimulus"

// Mobile training/puzzles tab toggle for the dashboard progress overview —
// the client-side equivalent of React's mobileStatTab state (Dashboard.tsx).
export default class extends Controller {
  static targets = ["trainingTab", "puzzlesTab", "overview"]

  showTraining() {
    this.select("training")
  }

  showPuzzles() {
    this.select("puzzles")
  }

  select(tab) {
    this.overviewTarget.dataset.mobileTab = tab
    this.trainingTabTarget.classList.toggle("active", tab === "training")
    this.trainingTabTarget.setAttribute("aria-selected", String(tab === "training"))
    this.puzzlesTabTarget.classList.toggle("active", tab === "puzzles")
    this.puzzlesTabTarget.setAttribute("aria-selected", String(tab === "puzzles"))
  }
}
