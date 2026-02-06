class IntegrationsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!, except: [:index, :show]
  before_action :set_integration, only: [:show, :edit, :update, :destroy, :test_connection, :sync_now]

  def index
    @integrations = Integration.all.order(:name)
  end

  def show
  end

  def new
    @integration = Integration.new
  end

  def create
    @integration = Integration.new(integration_params)

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
    case @integration.source_type
    when "google_forms"
      SyncGoogleFormsJob.perform_async(@integration.id)
      flash[:notice] = "Google Forms sync started."
    else
      flash[:alert] = "Manual sync not supported for this integration type."
    end

    redirect_to @integration
  end

  private

  def set_integration
    @integration = Integration.find(params[:id])
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
    else
      raise "Unknown integration type: #{integration.source_type}"
    end
  end
end
