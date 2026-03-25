# frozen_string_literal: true

class AddAccessibilityPreferencesToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :accessibility_preferences, :jsonb, default: {}
    add_index :users, :accessibility_preferences, using: :gin
  end
end