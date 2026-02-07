# frozen_string_literal: true

class CreateInsightJoinTables < ActiveRecord::Migration[8.0]
  def change
    # feedback_insights: links feedback to insights (many-to-many)
    create_table :feedback_insights do |t|
      t.references :feedback, null: false, foreign_key: true
      t.references :insight, null: false, foreign_key: true
      t.float :relevance_score, default: 0.0
      t.text :contribution_summary

      t.timestamps
    end

    add_index :feedback_insights, [:feedback_id, :insight_id], unique: true

    # insight_themes: links insights to themes (many-to-many)
    create_table :insight_themes do |t|
      t.references :insight, null: false, foreign_key: true
      t.references :theme, null: false, foreign_key: true
      t.float :relevance_score, default: 0.0

      t.timestamps
    end

    add_index :insight_themes, [:insight_id, :theme_id], unique: true

    # idea_relationships: links related ideas (self-referential many-to-many)
    create_table :idea_relationships do |t|
      t.references :idea, null: false, foreign_key: true
      t.references :related_idea, null: false, foreign_key: { to_table: :ideas }
      t.integer :relationship_type, default: 0, null: false
      t.text :explanation

      t.timestamps
    end

    add_index :idea_relationships, [:idea_id, :related_idea_id], unique: true
    add_index :idea_relationships, :relationship_type

    # insight_stakeholders: links insights to stakeholder segments
    create_table :insight_stakeholders do |t|
      t.references :insight, null: false, foreign_key: true
      t.references :stakeholder_segment, null: false, foreign_key: true
      t.integer :impact_level, default: 0
      t.text :impact_description

      t.timestamps
    end

    add_index :insight_stakeholders, [:insight_id, :stakeholder_segment_id],
              unique: true, name: "idx_insight_stakeholders_unique"

    # idea_insights: ideas can address multiple insights
    create_table :idea_insights do |t|
      t.references :idea, null: false, foreign_key: true
      t.references :insight, null: false, foreign_key: true
      t.integer :address_level, default: 0
      t.text :address_description

      t.timestamps
    end

    add_index :idea_insights, [:idea_id, :insight_id], unique: true
  end
end
