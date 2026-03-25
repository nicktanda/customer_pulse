class AddProgressToIdeaPullRequests < ActiveRecord::Migration[8.0]
  def change
    add_column :idea_pull_requests, :progress_message, :string
    add_column :idea_pull_requests, :progress_step, :integer
  end
end
