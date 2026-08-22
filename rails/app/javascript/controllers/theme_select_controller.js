import { Controller } from "@hotwired/stimulus"

// Settings page's light/dark/system radios. A Turbo visit only replaces
// <body>, never re-applies the server-rendered <html data-theme> or re-runs
// the layout's system-preference <head> script, so without this the page
// wouldn't actually flip until the next hard navigation. Applies the change
// to <html data-theme> immediately, then lets the row's normal
// requestSubmit() onchange persist it — same optimistic-update shape as
// theme_toggle_controller.
export default class extends Controller {
  apply(event) {
    const value = event.target.value
    const dark =
      value === "dark" ||
      (value === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)

    if (dark) {
      document.documentElement.dataset.theme = "dark"
    } else {
      delete document.documentElement.dataset.theme
    }
  }
}
