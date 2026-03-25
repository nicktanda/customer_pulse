# frozen_string_literal: true

class DisplayPreference < ApplicationRecord
  # Enums
  enum :theme_mode, {
    blue: 0,
    high_contrast: 1
  }

  # Validations
  validates :theme_mode, presence: true

  # Class methods
  def self.current_theme
    preference = first_or_create(theme_mode: :blue)
    preference.theme_mode
  end

  def self.toggle_theme!
    preference = first_or_create(theme_mode: :blue)
    new_theme = preference.blue? ? :high_contrast : :blue
    preference.update!(theme_mode: new_theme)
    new_theme
  end

  def self.set_theme!(theme)
    preference = first_or_create(theme_mode: :blue)
    preference.update!(theme_mode: theme)
  end

  # Instance methods
  def theme_label
    case theme_mode
    when 'blue'
      'Default Blue'
    when 'high_contrast'
      'High Contrast'
    else
      theme_mode.to_s.titleize
    end
  end

  def css_class
    "theme-#{theme_mode}"
  end
end