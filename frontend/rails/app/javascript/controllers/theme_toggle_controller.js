import { Controller } from "@hotwired/stimulus"

// Header light/dark toggle. Applies the flip instantly to <html data-theme>
// (no page reload) and saves it in the background — same optimistic-update
// shape as React's PreferencesContext. Reads the *current* resolved theme
// off <html data-theme>, which the layout's inline script already resolves
// for "system" before this controller ever connects.
export default class extends Controller {
  static targets = ["themeField", "sunIcon", "moonIcon"]

  connect() {
    this.sync()
  }

  sync() {
    const dark = document.documentElement.dataset.theme === "dark"
    this.sunIconTarget.hidden = !dark
    this.moonIconTarget.hidden = dark
  }

  toggle() {
    const dark = document.documentElement.dataset.theme === "dark"
    const next = dark ? "light" : "dark"

    if (next === "dark") {
      document.documentElement.dataset.theme = "dark"
    } else {
      delete document.documentElement.dataset.theme
    }
    this.sync()

    this.themeFieldTarget.value = next
    fetch(this.element.action, {
      method: "POST",
      body: new URLSearchParams(new FormData(this.element)),
    }).catch((err) => {
      console.warn("[theme-toggle] failed to save theme:", err)
    })
  }
}
