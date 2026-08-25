import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  toggle(event) {
    event.stopPropagation()
    const isHidden = this.menuTarget.hidden
    this.menuTarget.hidden = !isHidden
    this.element.setAttribute("aria-expanded", String(isHidden))

    if (!isHidden) {
      document.addEventListener("click", this.closeMenu)
    } else {
      document.removeEventListener("click", this.closeMenu)
    }
  }

  closeMenu = () => {
    this.menuTarget.hidden = true
    this.element.setAttribute("aria-expanded", "false")
    document.removeEventListener("click", this.closeMenu)
  }

  navigateTo(event) {
    const url = event.currentTarget.dataset.url
    if (url) {
      window.location.href = url
    }
  }

  logout(event) {
    // The form will handle the logout via Rails
  }

  disconnect() {
    document.removeEventListener("click", this.closeMenu)
  }
}
