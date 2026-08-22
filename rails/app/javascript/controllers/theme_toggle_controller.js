import { Controller } from "@hotwired/stimulus"

// Header light/dark toggle. Reads the resolved theme off <html data-theme>
// (already resolved for "system" by the inline script in the layout's
// <head>, which runs before this controller ever connects), flips it into
// a hidden field, and lets the surrounding form's native submit carry the
// change to SettingsController#update.
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
    this.themeFieldTarget.value = dark ? "light" : "dark"
  }
}
