# frozen_string_literal: true

class CreateStakeholderSegments < ActiveRecord::Migration[8.0]
  def change
    create_table :stakeholder_segments do |t|
      t.string :name, null: false
      t.integer :segment_type, default: 0, null: false
      t.text :description
      t.integer :size_estimate, default: 0
      t.integer :engagement_priority, default: 0
      t.text :engagement_strategy
      t.jsonb :characteristics, default: []
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :stakeholder_segments, :name
    add_index :stakeholder_segments, :segment_type
    add_index :stakeholder_segments, :engagement_priority
  end
end
