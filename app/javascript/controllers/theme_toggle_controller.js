import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggle"]
  static values = { currentTheme: String }

  connect() {
    this.applyTheme(this.currentThemeValue)
  }

  toggle() {
    const newTheme = this.currentThemeValue === 'high_contrast' ? 'default' : 'high_contrast'
    
    // Update the server
    fetch('/settings/theme', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({ theme_preference: newTheme })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        this.currentThemeValue = data.theme
        this.applyTheme(data.theme)
        this.updateToggleText(data.theme)
      } else {
        console.error('Failed to update theme:', data.errors)
      }
    })
    .catch(error => {
      console.error('Error updating theme:', error)
    })
  }

  applyTheme(theme) {
    const body = document.body
    
    // Remove existing theme classes
    body.classList.remove('theme-default', 'theme-high-contrast')
    
    // Add new theme class
    if (theme === 'high_contrast') {
      body.classList.add('theme-high-contrast')
    } else {
      body.classList.add('theme-default')
    }
  }

  updateToggleText(theme) {
    if (this.hasToggleTarget) {
      const isHighContrast = theme === 'high_contrast'
      this.toggleTarget.textContent = isHighContrast ? 'Switch to Default Theme' : 'Enable High Contrast'
      this.toggleTarget.setAttribute('aria-pressed', isHighContrast.toString())
    }
  }
}
