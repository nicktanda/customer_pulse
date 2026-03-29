class CreateSkills < ActiveRecord::Migration[8.0]
  def change
    create_table :skills do |t|
      t.string :name, null: false
      t.string :title, null: false
      t.text :description
      t.text :content, null: false
      t.references :user, null: false, foreign_key: true
      t.references :project, foreign_key: true

      t.timestamps
    end

    add_index :skills, :name, unique: true
  end
end
