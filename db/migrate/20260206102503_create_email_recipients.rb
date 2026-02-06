class CreateEmailRecipients < ActiveRecord::Migration[8.0]
  def change
    create_table :email_recipients do |t|
      t.string :email, null: false
      t.string :name
      t.boolean :active, default: true, null: false

      t.timestamps
    end

    add_index :email_recipients, :email, unique: true
    add_index :email_recipients, :active
  end
end
