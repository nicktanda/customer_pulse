# frozen_string_literal: true

class OnboardingController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :require_onboarding!, only: [:show, :update_step, :test_connection, :complete]

  STEPS = %w[welcome project team anthropic_api linear slack jira google_forms logrocket fullstory intercom zendesk sentry github recipients complete].freeze
  REQUIRED_STEPS = %w[project anthropic_api].freeze

  def show
    @current_step = current_user.onboarding_current_step || 'welcome'
    @steps = STEPS
    @step_index = STEPS.index(@current_step) || 0

    # Load existing integration data for the current step
    load_step_data
  end

  def update_step
    step = params[:step]
    return head :bad_request unless STEPS.include?(step)

    success = case step
    when 'welcome'
      true
    when 'project'
      save_project_step
    when 'team'
      save_team_step
    when 'anthropic_api'
      save_anthropic_api_step
    when 'linear'
      save_linear_step
    when 'slack'
      save_slack_step
    when 'jira'
      save_jira_step
    when 'google_forms'
      save_google_forms_step
    when 'logrocket'
      save_logrocket_step
    when 'fullstory'
      save_fullstory_step
    when 'intercom'
      save_intercom_step
    when 'zendesk'
      save_zendesk_step
    when 'sentry'
      save_sentry_step
    when 'github'
      save_github_step
    when 'recipients'
      save_recipients_step
    else
      true
    end

    if success
      next_step = params[:skip] ? next_step_for(step) : next_step_for(step)
      current_user.update_onboarding_step!(next_step)

      respond_to do |format|
        format.turbo_stream do
          @current_step = next_step
          @steps = STEPS
          @step_index = STEPS.index(@current_step) || 0
          load_step_data
        end
        format.html { redirect_to onboarding_path }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          @current_step = step
          @steps = STEPS
          @step_index = STEPS.index(@current_step) || 0
          load_step_data
          render turbo_stream: turbo_stream.replace("onboarding-step", partial: "onboarding/steps/#{step}")
        end
        format.html { redirect_to onboarding_path, alert: @error_message }
      end
    end
  end

  def test_connection
    integration_type = params[:integration_type]
    credentials = params[:credentials]&.permit!&.to_h || {}

    result = case integration_type
    when 'anthropic'
      test_anthropic_connection(credentials)
    when 'linear'
      test_linear_connection(credentials)
    when 'slack'
      test_slack_connection(credentials)
    when 'jira'
      test_jira_connection(credentials)
    when 'google_forms'
      test_google_forms_connection(credentials)
    when 'logrocket'
      test_logrocket_connection(credentials)
    when 'fullstory'
      test_fullstory_connection(credentials)
    when 'intercom'
      test_intercom_connection(credentials)
    when 'zendesk'
      test_zendesk_connection(credentials)
    when 'sentry'
      test_sentry_connection(credentials)
    when 'github'
      test_github_connection(credentials)
    else
      { success: false, message: "Unknown integration type" }
    end

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "connection-result",
          partial: "onboarding/connection_result",
          locals: { result: result }
        )
      end
      format.json { render json: result }
    end
  end

  def complete
    current_user.complete_onboarding!
    redirect_to root_path, notice: "Welcome to Customer Pulse! Your setup is complete."
  end

  private

  def load_step_data
    case @current_step
    when 'project'
      @project = current_user.projects.first || Project.new
    when 'team'
      @project = onboarding_project
      @project_users = @project&.project_users&.includes(:user) || []
    when 'linear'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'linear')
    when 'slack'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'slack')
    when 'jira'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'jira')
    when 'google_forms'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'google_forms')
    when 'logrocket'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'logrocket')
    when 'fullstory'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'fullstory')
    when 'intercom'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'intercom')
    when 'zendesk'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'zendesk')
    when 'sentry'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'sentry')
    when 'github'
      @integration = onboarding_project&.integrations&.find_by(source_type: 'github')
    when 'recipients'
      @recipients = onboarding_project&.email_recipients || EmailRecipient.none
    end
  end

  def onboarding_project
    @onboarding_project ||= current_user.projects.first
  end

  def next_step_for(current_step)
    current_index = STEPS.index(current_step)
    STEPS[current_index + 1] || 'complete'
  end

  def save_project_step
    project_name = params.dig(:project, :name)&.strip

    if project_name.blank?
      @error_message = "Project name is required."
      return false
    end

    # Check if user already has a project from a previous attempt
    @project = current_user.projects.first

    if @project
      @project.update!(name: project_name)
    else
      @project = Project.create!(name: project_name)
      @project.add_user(current_user, is_owner: true)
    end

    session[:current_project_id] = @project.id
    true
  rescue ActiveRecord::RecordInvalid => e
    @error_message = e.record.errors.full_messages.join(', ')
    false
  end

  def save_team_step
    return true if params[:skip].present?
    return true unless onboarding_project

    emails = params[:emails]&.split(',')&.map(&:strip)&.reject(&:blank?) || []

    emails.each do |email|
      user = User.find_by(email: email.downcase)
      next unless user
      next if onboarding_project.project_users.exists?(user: user)

      onboarding_project.project_users.create!(user: user, invited_by: current_user)
    end

    true
  end

  def save_anthropic_api_step
    # Anthropic API key is stored as an environment variable
    # We just verify it's configured and working
    if ENV['ANTHROPIC_API_KEY'].blank?
      @error_message = "Anthropic API key is not configured. Please set the ANTHROPIC_API_KEY environment variable."
      return false
    end
    true
  end

  def save_linear_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      api_key: params.dig(:integration, :api_key)
    }.compact

    return true if credentials[:api_key].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'linear')
    integration.name = "Linear"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_slack_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      bot_token: params.dig(:integration, :bot_token),
      channels: params.dig(:integration, :channels)&.split(',')&.map(&:strip)&.reject(&:blank?),
      keywords: params.dig(:integration, :keywords)&.split(',')&.map(&:strip)&.reject(&:blank?)
    }.compact

    return true if credentials[:bot_token].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'slack')
    integration.name = "Slack"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_jira_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      site_url: params.dig(:integration, :site_url),
      email: params.dig(:integration, :email),
      api_token: params.dig(:integration, :api_token)
    }.compact

    return true if credentials[:site_url].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'jira')
    integration.name = "Jira"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_google_forms_step
    return true if params[:skip].present?
    return true unless onboarding_project

    google_creds = params.dig(:integration, :google_credentials)
    spreadsheet_id = params.dig(:integration, :spreadsheet_id)
    sheet_name = params.dig(:integration, :sheet_name)

    return true if spreadsheet_id.blank?

    credentials = {
      spreadsheet_id: spreadsheet_id,
      sheet_name: sheet_name.presence || "Form Responses 1"
    }

    if google_creds.present?
      credentials[:google_credentials] = JSON.parse(google_creds) rescue google_creds
    end

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'google_forms')
    integration.name = "Google Forms"
    integration.enabled = true
    integration.sync_frequency_minutes = 60
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_logrocket_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      app_id: params.dig(:integration, :app_id),
      api_key: params.dig(:integration, :api_key)
    }.compact

    return true if credentials[:app_id].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'logrocket')
    integration.name = "LogRocket"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_fullstory_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      api_key: params.dig(:integration, :api_key),
      org_id: params.dig(:integration, :org_id)
    }.compact

    return true if credentials[:api_key].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'fullstory')
    integration.name = "FullStory"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_intercom_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      access_token: params.dig(:integration, :access_token)
    }.compact

    return true if credentials[:access_token].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'intercom')
    integration.name = "Intercom"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_zendesk_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      subdomain: params.dig(:integration, :subdomain),
      email: params.dig(:integration, :email),
      api_token: params.dig(:integration, :api_token)
    }.compact

    return true if credentials[:subdomain].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'zendesk')
    integration.name = "Zendesk"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_sentry_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      auth_token: params.dig(:integration, :auth_token),
      organization_slug: params.dig(:integration, :organization_slug),
      project_slugs: params.dig(:integration, :project_slugs)
    }.compact

    return true if credentials[:auth_token].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'sentry')
    integration.name = "Sentry"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_github_step
    return true if params[:skip].present?
    return true unless onboarding_project

    credentials = {
      access_token: params.dig(:integration, :access_token),
      owner: params.dig(:integration, :owner),
      repo: params.dig(:integration, :repo),
      default_branch: params.dig(:integration, :default_branch).presence || 'main'
    }.compact

    return true if credentials[:access_token].blank?

    integration = onboarding_project.integrations.find_or_initialize_by(source_type: 'github')
    integration.name = "GitHub"
    integration.enabled = true
    integration.update_credentials(credentials)
    integration.save!
  end

  def save_recipients_step
    return true if params[:skip].present?
    return true unless onboarding_project

    emails = params[:emails]&.split(',')&.map(&:strip)&.reject(&:blank?) || []

    emails.each do |email|
      onboarding_project.email_recipients.find_or_create_by!(email: email) do |recipient|
        recipient.name = email.split('@').first.titleize
      end
    end

    true
  end

  def test_anthropic_connection(_credentials)
    AnthropicApiValidator.new.validate
  end

  def test_linear_connection(credentials)
    return { success: false, message: "API key is required" } if credentials['api_key'].blank?

    temp_integration = Integration.new(source_type: 'linear')
    temp_integration.update_credentials(credentials)
    Integrations::LinearClient.new(temp_integration).test_connection
  end

  def test_slack_connection(credentials)
    return { success: false, message: "Bot token is required" } if credentials['bot_token'].blank?

    temp_integration = Integration.new(source_type: 'slack')
    temp_integration.update_credentials(credentials)
    Integrations::SlackClient.new(temp_integration).test_connection
  end

  def test_jira_connection(credentials)
    return { success: false, message: "Site URL is required" } if credentials['site_url'].blank?
    return { success: false, message: "Email is required" } if credentials['email'].blank?
    return { success: false, message: "API token is required" } if credentials['api_token'].blank?

    temp_integration = Integration.new(source_type: 'jira')
    temp_integration.update_credentials(credentials)
    Integrations::JiraClient.new(temp_integration).test_connection
  end

  def test_google_forms_connection(credentials)
    return { success: false, message: "Spreadsheet ID is required" } if credentials['spreadsheet_id'].blank?

    temp_integration = Integration.new(source_type: 'google_forms')
    temp_integration.update_credentials(credentials)
    Integrations::GoogleFormsClient.new(temp_integration).test_connection
  end

  def test_logrocket_connection(credentials)
    return { success: false, message: "App ID is required" } if credentials['app_id'].blank?
    return { success: false, message: "API Key is required" } if credentials['api_key'].blank?

    temp_integration = Integration.new(source_type: 'logrocket')
    temp_integration.update_credentials(credentials)
    Integrations::LogrocketClient.new(temp_integration).test_connection
  end

  def test_fullstory_connection(credentials)
    return { success: false, message: "API Key is required" } if credentials['api_key'].blank?

    temp_integration = Integration.new(source_type: 'fullstory')
    temp_integration.update_credentials(credentials)
    Integrations::FullstoryClient.new(temp_integration).test_connection
  end

  def test_intercom_connection(credentials)
    return { success: false, message: "Access Token is required" } if credentials['access_token'].blank?

    temp_integration = Integration.new(source_type: 'intercom')
    temp_integration.update_credentials(credentials)
    Integrations::IntercomClient.new(temp_integration).test_connection
  end

  def test_zendesk_connection(credentials)
    return { success: false, message: "Subdomain is required" } if credentials['subdomain'].blank?
    return { success: false, message: "Email is required" } if credentials['email'].blank?
    return { success: false, message: "API Token is required" } if credentials['api_token'].blank?

    temp_integration = Integration.new(source_type: 'zendesk')
    temp_integration.update_credentials(credentials)
    Integrations::ZendeskClient.new(temp_integration).test_connection
  end

  def test_sentry_connection(credentials)
    return { success: false, message: "Auth Token is required" } if credentials['auth_token'].blank?
    return { success: false, message: "Organization Slug is required" } if credentials['organization_slug'].blank?

    temp_integration = Integration.new(source_type: 'sentry')
    temp_integration.update_credentials(credentials)
    Integrations::SentryClient.new(temp_integration).test_connection
  end

  def test_github_connection(credentials)
    return { success: false, message: "Access Token is required" } if credentials['access_token'].blank?
    return { success: false, message: "Owner is required" } if credentials['owner'].blank?
    return { success: false, message: "Repository is required" } if credentials['repo'].blank?

    credentials['default_branch'] ||= 'main'

    temp_integration = Integration.new(source_type: 'github')
    temp_integration.update_credentials(credentials)
    Integrations::GithubClient.new(temp_integration).test_connection
  end
end
