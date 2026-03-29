class MakeProjectIdRequired < ActiveRecord::Migration[8.0]
  def change
    change_column_null :feedbacks, :project_id, false
    change_column_null :integrations, :project_id, false
    change_column_null :insights, :project_id, false
    change_column_null :ideas, :project_id, false
    change_column_null :themes, :project_id, false
    change_column_null :stakeholder_segments, :project_id, false
    change_column_null :pm_personas, :project_id, false
    change_column_null :pulse_reports, :project_id, false
    change_column_null :email_recipients, :project_id, false
  end
end
