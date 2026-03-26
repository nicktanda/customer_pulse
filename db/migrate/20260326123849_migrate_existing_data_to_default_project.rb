class MigrateExistingDataToDefaultProject < ActiveRecord::Migration[8.0]
  def up
    # Only run if there's existing data to migrate
    return unless data_exists?

    # Create default project
    default_project_id = execute(<<-SQL).first['id']
      INSERT INTO projects (name, slug, description, created_at, updated_at)
      VALUES ('Default Project', 'default', 'Automatically created project for existing data', NOW(), NOW())
      RETURNING id
    SQL

    # Assign all existing users as owners of the default project
    execute(<<-SQL)
      INSERT INTO project_users (project_id, user_id, role, created_at, updated_at)
      SELECT #{default_project_id}, id, 2, NOW(), NOW()
      FROM users
    SQL

    # Migrate all data tables to the default project
    tables_to_migrate = %w[feedbacks integrations insights ideas themes
                           stakeholder_segments pm_personas pulse_reports email_recipients]

    tables_to_migrate.each do |table|
      execute("UPDATE #{table} SET project_id = #{default_project_id} WHERE project_id IS NULL")
    end
  end

  def down
    # Find the default project
    result = execute("SELECT id FROM projects WHERE slug = 'default' LIMIT 1")
    return if result.ntuples.zero?

    default_project_id = result.first['id']

    # Remove project assignments
    execute("DELETE FROM project_users WHERE project_id = #{default_project_id}")

    # Set project_id to NULL on all tables
    tables_to_migrate = %w[feedbacks integrations insights ideas themes
                           stakeholder_segments pm_personas pulse_reports email_recipients]

    tables_to_migrate.each do |table|
      execute("UPDATE #{table} SET project_id = NULL WHERE project_id = #{default_project_id}")
    end

    # Delete the default project
    execute("DELETE FROM projects WHERE id = #{default_project_id}")
  end

  private

  def data_exists?
    tables_to_check = %w[feedbacks integrations insights ideas themes
                         stakeholder_segments pm_personas pulse_reports email_recipients users]

    tables_to_check.any? do |table|
      result = execute("SELECT EXISTS(SELECT 1 FROM #{table} LIMIT 1)")
      result.first['exists'] == 't' || result.first['exists'] == true
    end
  end
end
