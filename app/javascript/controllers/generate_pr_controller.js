import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "icon", "text"]
  static values = { ideaId: Number }

  submit(event) {
    // Store the idea ID so we can auto-open the PR when it's ready
    if (this.hasIdeaIdValue) {
      const pendingPRs = JSON.parse(sessionStorage.getItem("pendingPRs") || "[]")
      if (!pendingPRs.includes(this.ideaIdValue)) {
        pendingPRs.push(this.ideaIdValue)
        sessionStorage.setItem("pendingPRs", JSON.stringify(pendingPRs))
      }
    }

    // Show loading state
    this.buttonTarget.disabled = true
    this.buttonTarget.classList.add("opacity-75", "cursor-wait")

    this.iconTarget.innerHTML = `
      <svg class="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `
    this.textTarget.textContent = "Starting..."
  }
}
