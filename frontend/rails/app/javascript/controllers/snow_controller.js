import { Controller } from "@hotwired/stimulus"
import { snow } from "../utils/snow"
import { readSnowEnabled, setSnowEnabled } from "../utils/snow_preference"

const SNOW_CYCLE_MS = 15 * 1000

// Mounted on <body>, so it stays in scope for the whole app (matching
// React's App.tsx-level effect) while the Settings toggle checkbox, nested
// anywhere inside body, can reach it via the same data-controller="snow".
export default class extends Controller {
  static targets = ["toggleInput"]

  connect() {
    const enabled = readSnowEnabled()
    if (this.hasToggleInputTarget) this.toggleInputTarget.checked = enabled
    this.applyEnabled(enabled)
  }

  disconnect() {
    this.stopLoop()
  }

  toggle(event) {
    const enabled = event.currentTarget.checked
    setSnowEnabled(enabled)
    this.applyEnabled(enabled)
  }

  applyEnabled(enabled) {
    this.stopLoop()
    if (!enabled) return

    this.stopCurrent = snow()
    this.interval = window.setInterval(() => {
      this.stopCurrent = snow()
    }, SNOW_CYCLE_MS)
  }

  stopLoop() {
    if (this.interval) window.clearInterval(this.interval)
    this.interval = null
    this.stopCurrent?.()
    this.stopCurrent = null
  }
}
