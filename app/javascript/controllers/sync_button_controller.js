import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["icon", "text"]
  static values = { url: String, refresh: { type: Boolean, default: true }, loadingText: { type: String, default: "Working..." } }

  connect() {
    console.log("Sync button controller connected, url:", this.urlValue)
  }

  sync() {
    console.log("Sync button clicked")

    // Show syncing state
    this.iconTarget.classList.add("animate-spin")
    if (this.hasTextTarget) {
      this.originalText = this.textTarget.textContent
      this.textTarget.textContent = this.loadingTextValue
    }
    this.element.disabled = true

    // Submit the request and follow redirect
    fetch(this.urlValue, {
      method: "POST",
      headers: {
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content,
        "Accept": "text/vnd.turbo-stream.html, text/html"
      },
      redirect: "follow"
    }).then(response => {
      console.log("Request complete, status:", response.status)
      // Follow the redirect URL if we got one
      if (response.redirected) {
        Turbo.visit(response.url)
      } else if (this.refreshValue) {
        Turbo.visit(window.location.href, { action: "replace" })
      } else {
        this.resetButton()
      }
    }).catch(error => {
      console.error("Sync error:", error)
      this.resetButton()
    })
  }

  resetButton() {
    this.iconTarget.classList.remove("animate-spin")
    if (this.hasTextTarget && this.originalText) {
      this.textTarget.textContent = this.originalText
    }
    this.element.disabled = false
  }
}
