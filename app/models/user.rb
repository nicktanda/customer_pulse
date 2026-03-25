# frozen_string_literal: true

class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # Enums
  enum :role, { user: 0, admin: 1 }

  # Validations
  validates :name, presence: true

  # Accessibility preferences
  THEME_OPTIONS = {
    'default' => 'Default Blue',
    'high_contrast' => 'High Contrast Black'
  }.freeze

  def accessibility_preferences
    super || {}
  end

  def theme_preference
    accessibility_preferences['theme'] || 'default'
  end

  def theme_preference=(value)
    return unless THEME_OPTIONS.key?(value)
    
    self.accessibility_preferences = accessibility_preferences.merge(
      'theme' => value
    )
  end

  def high_contrast_mode?
    theme_preference == 'high_contrast'
  end

  def theme_css_class
    high_contrast_mode? ? 'theme-high-contrast' : 'theme-default'
  end
end