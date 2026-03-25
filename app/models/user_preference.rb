# frozen_string_literal: true

class UserPreference < ApplicationRecord
  belongs_to :user

  # Enums
  enum :ui_theme, {
    default: 0,
    high_contrast: 1
  }

  # Validations
  validates :user_id, uniqueness: true

  # Callbacks
  after_initialize :set_defaults

  private

  def set_defaults
    self.ui_theme ||= :default if new_record?
  end
end