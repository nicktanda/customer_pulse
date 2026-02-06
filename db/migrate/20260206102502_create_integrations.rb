class CreateIntegrations < ActiveRecord::Migration[8.0]
  def change
    create_table :integrations do |t|
      t.string :name, null: false
      t.integer :source_type, null: false
      t.text :credentials_ciphertext
      t.string :webhook_secret
      t.boolean :enabled, default: true, null: false
      t.datetime :last_synced_at
      t.integer :sync_frequency_minutes, default: 15

      t.timestamps
    end

    add_index :integrations, :source_type
    add_index :integrations, :enabled
  end
end
