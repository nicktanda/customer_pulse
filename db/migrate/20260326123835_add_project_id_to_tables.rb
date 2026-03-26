class AddProjectIdToTables < ActiveRecord::Migration[8.0]
  def change
    # Add project_id to all data tables (nullable initially for data migration)
    add_reference :feedbacks, :project, foreign_key: true, index: true
    add_reference :integrations, :project, foreign_key: true, index: true
    add_reference :insights, :project, foreign_key: true, index: true
    add_reference :ideas, :project, foreign_key: true, index: true
    add_reference :themes, :project, foreign_key: true, index: true
    add_reference :stakeholder_segments, :project, foreign_key: true, index: true
    add_reference :pm_personas, :project, foreign_key: true, index: true
    add_reference :pulse_reports, :project, foreign_key: true, index: true
    add_reference :email_recipients, :project, foreign_key: true, index: true
  end
end
