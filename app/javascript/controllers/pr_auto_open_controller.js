import { Controller } from "@hotwired/stimulus"

// This controller monitors for PRs that have finished generating and auto-opens them
// It should be placed on a container that includes PR status elements
export default class extends Controller {
  static targets = ["openPr"]

  connect() {
    this.checkForCompletedPRs()
  }

  checkForCompletedPRs() {
    const pendingPRs = JSON.parse(sessionStorage.getItem("pendingPRs") || "[]")
    if (pendingPRs.length === 0) return

    // Find all open PR links on the page
    const openPrElements = this.openPrTargets

    openPrElements.forEach(element => {
      const ideaId = parseInt(element.dataset.ideaId, 10)
      const prUrl = element.dataset.prUrl

      if (pendingPRs.includes(ideaId) && prUrl) {
        // This PR was pending and is now open - auto-open it!
        console.log(`Auto-opening PR for idea ${ideaId}: ${prUrl}`)
        window.open(prUrl, "_blank")

        // Remove from pending list
        const updatedPending = pendingPRs.filter(id => id !== ideaId)
        sessionStorage.setItem("pendingPRs", JSON.stringify(updatedPending))
      }
    })
  }
}
