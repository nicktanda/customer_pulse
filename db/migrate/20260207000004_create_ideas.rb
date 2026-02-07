# frozen_string_literal: true

class CreateIdeas < ActiveRecord::Migration[8.0]
  def change
    create_table :ideas do |t|
      t.string :title, null: false
      t.text :description, null: false
      t.integer :idea_type, default: 0, null: false
      t.integer :effort_estimate, default: 0, null: false
      t.integer :impact_estimate, default: 0, null: false
      t.integer :confidence_score, default: 0
      t.integer :status, default: 0, null: false
      t.references :pm_persona, foreign_key: true
      t.text :rationale
      t.text :risks
      t.jsonb :implementation_hints, default: []
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :ideas, :idea_type
    add_index :ideas, :effort_estimate
    add_index :ideas, :impact_estimate
    add_index :ideas, :status
  end
end
