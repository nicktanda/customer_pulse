class User < ApplicationRecord
  # Add theme preference to user model
  enum :theme_preference, {
    default: 0,
    high_contrast: 1
  }, prefix: true

  # Default theme if not set
  def current_theme
    theme_preference || 'default'
  end

  def high_contrast_mode?
    theme_preference == 'high_contrast'
  end
end
