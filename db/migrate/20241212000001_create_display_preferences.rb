class CreateDisplayPreferences < ActiveRecord::Migration[7.1]
  def change
    create_table :display_preferences do |t|
      t.integer :theme_mode, default: 0, null: false
      t.timestamps
    end

    add_index :display_preferences, :theme_mode
  end
end