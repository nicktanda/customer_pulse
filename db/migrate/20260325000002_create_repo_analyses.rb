# frozen_string_literal: true

class CreateRepoAnalyses < ActiveRecord::Migration[8.0]
  def change
    create_table :repo_analyses do |t|
      t.references :integration, null: false, foreign_key: true

      t.string :commit_sha
      t.jsonb :tech_stack, default: {}
      t.jsonb :structure, default: {}
      t.jsonb :conventions, default: {}
      t.datetime :analyzed_at

      t.timestamps
    end

    add_index :repo_analyses, :commit_sha
    add_index :repo_analyses, :analyzed_at
  end
end
