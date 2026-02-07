# frozen_string_literal: true

class CreateThemes < ActiveRecord::Migration[8.0]
  def change
    create_table :themes do |t|
      t.string :name, null: false
      t.text :description
      t.integer :priority_score, default: 0
      t.integer :insight_count, default: 0
      t.integer :affected_users_estimate, default: 0
      t.jsonb :metadata, default: {}
      t.datetime :analyzed_at

      t.timestamps
    end

    add_index :themes, :name
    add_index :themes, :priority_score
    add_index :themes, :analyzed_at
  end
end
