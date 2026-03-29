class UpdateEmailRecipientsUniqueIndex < ActiveRecord::Migration[8.0]
  def change
    # Remove the old unique index on email only
    remove_index :email_recipients, :email

    # Add a new unique index scoped to project
    add_index :email_recipients, [:project_id, :email], unique: true
  end
end
