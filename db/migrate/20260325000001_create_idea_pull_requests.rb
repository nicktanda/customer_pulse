# frozen_string_literal: true

class CreateIdeaPullRequests < ActiveRecord::Migration[8.0]
  def change
    create_table :idea_pull_requests do |t|
      t.references :idea, null: false, foreign_key: true
      t.references :integration, null: false, foreign_key: true

      t.integer :pr_number
      t.string :pr_url
      t.string :branch_name

      t.integer :status, default: 0, null: false
      t.jsonb :files_changed, default: []
      t.text :error_message
      t.datetime :merged_at

      t.timestamps
    end

    add_index :idea_pull_requests, :status
    add_index :idea_pull_requests, :pr_number
  end
end
