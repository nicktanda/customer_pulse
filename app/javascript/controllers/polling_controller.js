import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    interval: { type: Number, default: 30000 },
    syncUrl: String
  }

  connect() {
    this.startPolling()
  }

  disconnect() {
    this.stopPolling()
  }

  startPolling() {
    this.poll = setInterval(() => {
      this.refreshWithScrollPreserve()
    }, this.intervalValue)
  }

  stopPolling() {
    if (this.poll) {
      clearInterval(this.poll)
    }
  }

  refreshWithScrollPreserve() {
    // Save scroll position
    const scrollY = window.scrollY

    // Fetch the page and update just the body content
    fetch(window.location.href, {
      headers: { "Accept": "text/html" }
    })
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, "text/html")

        // Update the main content area
        const newContent = doc.querySelector("main") || doc.querySelector("body")
        const currentContent = document.querySelector("main") || document.querySelector("body")

        if (newContent && currentContent) {
          currentContent.innerHTML = newContent.innerHTML

          // Restore scroll position
          window.scrollTo(0, scrollY)
        }
      })
      .catch(err => console.error("Polling refresh failed:", err))
  }
}
