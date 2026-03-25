# frozen_string_literal: true

class UserPreference < ApplicationRecord
  belongs_to :user

  # Enums
  enum :theme, {
    default: 0,
    high_contrast: 1
  }

  # Validations
  validates :user_id, uniqueness: true

  # Class methods
  def self.theme_options
    {
      'Default (Blue highlights)' => 'default',
      'High Contrast (Black highlights)' => 'high_contrast'
    }
  end

  # Instance methods
  def theme_label
    case theme
    when 'high_contrast'
      'High Contrast'
    else
      'Default'
    end
  end

  def css_theme_class
    case theme
    when 'high_contrast'
      'theme-high-contrast'
    else
      'theme-default'
    end
  end
