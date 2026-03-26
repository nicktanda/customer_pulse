class IntegrationsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_project_access!
  before_action :require_project_editor!, except: [:index, :show, :sync_all]
  before_action :set_integration, only: [:show, :edit, :update, :destroy, :test_connection, :sync_now]

  def index
    @integrations = current_project.integrations.order(:name)
  end

  def show
  end

  def new
    @integration = current_project.integrations.build
  end

  def create
    @integration = current_project.integrations.build(integration_params)

    if @integration.save
      redirect_to @integration, notice: "Integration created successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @integration.update(integration_params)
      redirect_to @integration, notice: "Integration updated successfully."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @integration.destroy
    redirect_to integrations_path, notice: "Integration deleted."
  end

  def test_connection
    client = integration_client_for(@integration)
    result = client.test_connection

    if result[:success]
      flash[:notice] = "Connection successful! #{result[:message]}"
    else
      flash[:alert] = "Connection failed: #{result[:message]}"
    end

    redirect_to @integration
  rescue => e
    flash[:alert] = "Connection test failed: #{e.message}"
    redirect_to @integration
  end

  def sync_now
    job_class = sync_job_for(@integration.source_type)

    if job_class
      job_class.perform_async(@integration.id)
      flash[:notice] = "#{@integration.name} sync started."
    else
      flash[:alert] = "Manual sync not supported for this integration type."
    end

    redirect_to @integration
  end

  def sync_all
    current_project.integrations.enabled.each do |integration|
      job_class = sync_job_for(integration.source_type)
      job_class&.new&.perform(integration.id)
    end

    flash[:notice] = "Sync completed for all enabled integrations."
    redirect_back fallback_location: integrations_path
  end

  private

  def set_integration
    @integration = current_project.integrations.find(params[:id])
  end

  def integration_params
    params.require(:integration).permit(:name, :source_type, :enabled, :sync_frequency_minutes, :credentials, :webhook_secret)
  end

  def integration_client_for(integration)
    case integration.source_type
    when "linear"
      Integrations::LinearClient.new(integration)
    when "google_forms"
      Integrations::GoogleFormsClient.new(integration)
    when "slack"
      Integrations::SlackClient.new(integration)
    when "sentry"
      Integrations::SentryClient.new(integration)
    when "github"
      Integrations::GithubClient.new(integration)
    else
      raise "Unknown integration type: #{integration.source_type}"
    end
  end

  def sync_job_for(source_type)
    {
      "linear" => SyncLinearJob,
      "google_forms" => SyncGoogleFormsJob,
      "slack" => SyncSlackJob,
      "jira" => SyncJiraJob,
      "sentry" => SyncSentryJob,
      "zendesk" => SyncZendeskJob,
      "intercom" => SyncIntercomJob,
      "logrocket" => SyncLogrocketJob,
      "fullstory" => SyncFullstoryJob,
      "gong" => SyncGongJob,
      "excel_online" => SyncExcelOnlineJob
    }[source_type]
  end
end
