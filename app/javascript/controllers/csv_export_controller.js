import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "status"]
  
  connect() {
    console.log("CSV Export controller connected")
  }

  export(event) {
    event.preventDefault()
    
    // Show loading state
    if (this.hasButtonTarget) {
      this.buttonTarget.disabled = true
      this.buttonTarget.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Exporting...
      `
    }

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = "Preparing CSV export..."
      this.statusTarget.classList.remove("hidden")
    }

    // Get current URL parameters to maintain filters
    const currentParams = new URLSearchParams(window.location.search)
    const exportUrl = new URL(window.location.pathname + '/export_csv', window.location.origin)
    
    // Copy current filters to export URL
    currentParams.forEach((value, key) => {
      exportUrl.searchParams.append(key, value)
    })
    exportUrl.searchParams.append('format', 'csv')
    
    console.log("Initiating CSV export to:", exportUrl.toString())

    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = exportUrl.toString()
    link.style.display = 'none'
    document.body.appendChild(link)
    
    // Trigger the download
    link.click()
    document.body.removeChild(link)
    
    // Reset button state after a delay
    setTimeout(() => {
      this.resetButton()
      if (this.hasStatusTarget) {
        this.statusTarget.textContent = "Export completed!"
        setTimeout(() => {
          this.statusTarget.classList.add("hidden")
        }, 3000)
      }
    }, 1000)
  }

  resetButton() {
    if (this.hasButtonTarget) {
      this.buttonTarget.disabled = false
      this.buttonTarget.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Export CSV
      `
    }
  }

  // Handle any errors that might occur
  handleError(error) {
    console.error("CSV Export Error:", error)
    
    if (this.hasStatusTarget) {
      this.statusTarget.textContent = "Export failed. Please try again."
      this.statusTarget.classList.add("text-red-600")
    }
    
    this.resetButton()
    
    // Show error to user
    if (window.alert) {
      alert("CSV export failed. Please try again or contact support if the issue persists.")
    }
  }
}