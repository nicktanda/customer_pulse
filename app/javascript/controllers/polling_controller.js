import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    interval: { type: Number, default: 30000 },
    syncUrl: String
  }

  connect() {
    console.log("Polling controller connected, interval:", this.intervalValue)
    this.startPolling()
  }

  disconnect() {
    this.stopPolling()
  }

  startPolling() {
    this.poll = setInterval(() => {
      this.syncAndRefresh()
    }, this.intervalValue)
  }

  stopPolling() {
    if (this.poll) {
      clearInterval(this.poll)
    }
  }

  syncAndRefresh() {
    console.log("Polling: syncing and refreshing")

    // Trigger sync first, then refresh
    if (this.syncUrlValue) {
      fetch(this.syncUrlValue, {
        method: "POST",
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        }
      }).then(() => {
        setTimeout(() => {
          Turbo.visit(window.location.href, { action: "replace" })
        }, 2000)
      })
    } else {
      Turbo.visit(window.location.href, { action: "replace" })
    }
  }
}
