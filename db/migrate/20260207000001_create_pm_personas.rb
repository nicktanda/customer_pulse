# frozen_string_literal: true

class CreatePmPersonas < ActiveRecord::Migration[8.0]
  def change
    create_table :pm_personas do |t|
      t.string :name, null: false
      t.string :archetype, null: false
      t.text :description
      t.text :system_prompt, null: false
      t.jsonb :priorities, default: []
      t.boolean :active, default: true, null: false

      t.timestamps
    end

    add_index :pm_personas, :archetype, unique: true
    add_index :pm_personas, :active
  end
end
