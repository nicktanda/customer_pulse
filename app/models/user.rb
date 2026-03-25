class User < ApplicationRecord
  # Theme preferences
  enum :theme_preference, {
    default: 0,
    high_contrast: 1
  }, prefix: true

  # Callbacks
  after_initialize :set_default_theme

  def theme_css_class
    case theme_preference
    when 'high_contrast'
      'high-contrast-theme'
    else
      'default-theme'
    end
  end

  private

  def set_default_theme
    self.theme_preference ||= 'default' if new_record?
  end
end