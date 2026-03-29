class CreateProjectUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :project_users do |t|
      t.references :project, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :role, null: false, default: 0  # 0=viewer, 1=editor, 2=owner
      t.references :invited_by, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :project_users, [:project_id, :user_id], unique: true
  end
end
