class CreateProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.text :description
      t.string :slug, null: false
      t.timestamps
    end
    add_index :projects, :slug, unique: true
  end
end
