class User < ApplicationRecord
  # Theme preferences
  enum :theme_mode, {
    default: 0,
    high_contrast: 1
  }

  # Default to standard theme
  after_initialize :set_default_theme, if: :new_record?

  def theme_css_class
    case theme_mode
    when 'high_contrast'
      'theme-high-contrast'
    else
      'theme-default'
    end
  end

  private

  def set_default_theme
    self.theme_mode ||= :default
  end
end