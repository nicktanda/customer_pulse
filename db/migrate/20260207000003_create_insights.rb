# frozen_string_literal: true

class CreateInsights < ActiveRecord::Migration[8.0]
  def change
    create_table :insights do |t|
      t.string :title, null: false
      t.text :description, null: false
      t.integer :insight_type, default: 0, null: false
      t.integer :severity, default: 0, null: false
      t.integer :confidence_score, default: 0
      t.integer :affected_users_count, default: 0
      t.integer :feedback_count, default: 0
      t.integer :status, default: 0, null: false
      t.references :pm_persona, foreign_key: true
      t.jsonb :evidence, default: []
      t.jsonb :metadata, default: {}
      t.datetime :discovered_at
      t.datetime :addressed_at

      t.timestamps
    end

    add_index :insights, :insight_type
    add_index :insights, :severity
    add_index :insights, :status
    add_index :insights, :confidence_score
    add_index :insights, :discovered_at
  end
end
