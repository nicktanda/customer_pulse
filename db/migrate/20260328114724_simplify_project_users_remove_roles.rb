class SimplifyProjectUsersRemoveRoles < ActiveRecord::Migration[8.0]
  def up
    # Add is_owner column
    add_column :project_users, :is_owner, :boolean, default: false, null: false

    # Migrate existing owners (role = 2 was owner in the enum)
    execute <<-SQL
      UPDATE project_users SET is_owner = true WHERE role = 2
    SQL

    # Remove the role column
    remove_column :project_users, :role
  end

  def down
    # Add role column back
    add_column :project_users, :role, :integer, default: 0, null: false

    # Migrate is_owner back to role
    execute <<-SQL
      UPDATE project_users SET role = 2 WHERE is_owner = true
    SQL

    # Remove is_owner column
    remove_column :project_users, :is_owner
  end
end
