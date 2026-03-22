import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["icon", "text"]
  static values = { url: String }

  connect() {
    console.log("Sync button controller connected, url:", this.urlValue)
  }

  sync() {
    console.log("Sync button clicked")

    // Show syncing state
    this.iconTarget.classList.add("animate-spin")
    this.textTarget.textContent = "Syncing..."
    this.element.disabled = true

    // Submit the request
    fetch(this.urlValue, {
      method: "POST",
      headers: {
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      }
    }).then(() => {
      console.log("Sync request complete, refreshing in 2s")
      // Refresh page after delay to allow sync to complete
      setTimeout(() => {
        Turbo.visit(window.location.href, { action: "replace" })
      }, 2000)
    })
  }
}
