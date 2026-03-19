import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["field"]

  async testConnection(event) {
    const button = event.currentTarget
    const integrationType = event.params.type
    const resultContainer = document.getElementById("connection-result")

    // Collect field values
    const credentials = {}
    this.fieldTargets.forEach(field => {
      const fieldName = field.dataset.field
      if (fieldName && field.value) {
        credentials[fieldName] = field.value
      }
    })

    // Show loading state
    button.disabled = true
    const originalContent = button.innerHTML
    button.innerHTML = `
      <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Testing...
    `

    try {
      const response = await fetch("/onboarding/test_connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content,
          "Accept": "text/vnd.turbo-stream.html"
        },
        body: JSON.stringify({
          integration_type: integrationType,
          credentials: credentials
        })
      })

      if (response.ok) {
        const html = await response.text()
        resultContainer.innerHTML = html

        // Extract the inner content from turbo-stream if present
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, "text/html")
        const template = doc.querySelector("template")
        if (template) {
          resultContainer.innerHTML = template.innerHTML
        }
      } else {
        resultContainer.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-xl p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h4 class="font-medium text-red-800">Connection Failed</h4>
                <p class="text-sm text-red-700">An error occurred while testing the connection.</p>
              </div>
            </div>
          </div>
        `
      }
    } catch (error) {
      console.error("Connection test error:", error)
      resultContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <h4 class="font-medium text-red-800">Connection Failed</h4>
              <p class="text-sm text-red-700">${error.message}</p>
            </div>
          </div>
        </div>
      `
    } finally {
      button.disabled = false
      button.innerHTML = originalContent
    }
  }
}
