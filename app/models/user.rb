# frozen_string_literal: true

class User < ApplicationRecord
  has_one :user_preference, dependent: :destroy

  # Devise modules or authentication setup would go here
  # For now, basic user model structure

  def preference
    user_preference || build_user_preference
  end

  def theme
    preference.theme || 'default'
  end

  def theme_css_class
    preference.css_theme_class
  end
