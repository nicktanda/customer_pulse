import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    currentStep: String
  }

  connect() {
    // Add entrance animation
    this.element.classList.add("animate-in", "fade-in", "duration-300")
  }

  currentStepValueChanged() {
    // Handle step changes if needed
    this.element.classList.add("animate-in", "fade-in", "duration-300")
  }
}
