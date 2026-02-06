class CreateFeedbacks < ActiveRecord::Migration[8.0]
  def change
    create_table :feedbacks do |t|
      t.integer :source, null: false
      t.string :source_external_id
      t.string :title
      t.text :content
      t.string :author_name
      t.string :author_email
      t.integer :category, default: 0, null: false
      t.integer :priority, default: 0, null: false
      t.integer :status, default: 0, null: false
      t.text :ai_summary
      t.float :ai_confidence_score
      t.datetime :ai_processed_at
      t.boolean :manually_reviewed, default: false, null: false
      t.jsonb :raw_data, default: {}

      t.timestamps
    end

    add_index :feedbacks, :source
    add_index :feedbacks, :source_external_id
    add_index :feedbacks, [:source, :source_external_id], unique: true
    add_index :feedbacks, :category
    add_index :feedbacks, :priority
    add_index :feedbacks, :status
    add_index :feedbacks, :ai_processed_at
    add_index :feedbacks, :created_at
  end
end
