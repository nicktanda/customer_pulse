import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["apiKey", "result", "resultContainer"]

  async testConnection(event) {
    const button = event.currentTarget

    const credentials = {
      api_key: this.apiKeyTarget.value
    }

    // Show loading state
    button.disabled = true
    const originalContent = button.innerHTML
    button.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Testing...
    `

    try {
      const response = await fetch("/settings/test_anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content,
          "Accept": "application/json"
        },
        body: JSON.stringify({ anthropic: credentials })
      })

      const result = await response.json()
      this.resultContainerTarget.classList.remove("hidden")

      if (result.success) {
        this.resultTarget.className = "p-3 rounded-md text-sm bg-green-50 border border-green-200"
        this.resultTarget.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <span class="font-medium text-green-800">Connection Successful</span>
              <p class="text-green-700">${result.message}</p>
            </div>
          </div>
        `
      } else {
        this.resultTarget.className = "p-3 rounded-md text-sm bg-red-50 border border-red-200"
        this.resultTarget.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <span class="font-medium text-red-800">Connection Failed</span>
              <p class="text-red-700">${result.message}</p>
            </div>
          </div>
        `
      }
    } catch (error) {
      console.error("Connection test error:", error)
      this.resultContainerTarget.classList.remove("hidden")
      this.resultTarget.className = "p-3 rounded-md text-sm bg-red-50 border border-red-200"
      this.resultTarget.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <span class="font-medium text-red-800">Connection Failed</span>
            <p class="text-red-700">${error.message}</p>
          </div>
        </div>
      `
    } finally {
      button.disabled = false
      button.innerHTML = originalContent
    }
  }
}
