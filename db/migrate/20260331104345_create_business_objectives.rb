# frozen_string_literal: true

class CreateBusinessObjectives < ActiveRecord::Migration[8.0]
  def change
    create_table :business_objectives do |t|
      t.references :project, null: false, foreign_key: true
      t.string :title, null: false
      t.text :description
      t.integer :objective_type, default: 0, null: false
      t.integer :priority, default: 0, null: false
      t.integer :status, default: 0, null: false
      t.date :target_date
      t.text :success_metrics
      t.boolean :active, default: true, null: false
      t.timestamps
    end

    add_index :business_objectives, :objective_type
    add_index :business_objectives, :priority
    add_index :business_objectives, :status
    add_index :business_objectives, :active
    add_index :business_objectives, :target_date
  end
end
