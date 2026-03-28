class ApplicationController < ActionController::Base
  include Pagy::Backend

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :require_onboarding!
  before_action :set_current_project

  helper_method :current_project, :current_project_user

  protected

  def require_onboarding!
    return unless user_signed_in?
    return if devise_controller?
    return if current_user.onboarding_completed?
    return if self.class.name == "OnboardingController"

    redirect_to onboarding_path
  end

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:name])
  end

  def require_admin!
    unless current_user&.admin?
      flash[:alert] = "You are not authorized to perform this action."
      redirect_to root_path
    end
  end

  # Project helpers
  def current_project
    @current_project ||= find_current_project
  end

  def current_project_user
    return nil unless current_project && current_user
    @current_project_user ||= current_project.project_users.find_by(user: current_user)
  end

  def set_current_project
    return unless user_signed_in?
    return if devise_controller?
    return if self.class.name == "OnboardingController"
    return if self.class.name == "ProjectsController" && action_name.in?(%w[index new create])

    if current_project.nil? && current_user.projects.any?
      session[:current_project_id] = current_user.projects.first.id
    end
  end

  def require_project!
    unless current_project
      flash[:alert] = "Please select a project first."
      redirect_to projects_path
    end
  end

  def require_project_access!
    require_project!
    return if performed?

    unless current_project_user
      flash[:alert] = "You don't have access to this project."
      redirect_to projects_path
    end
  end

  def require_project_owner!
    require_project_access!
    return if performed?

    unless current_project_user&.can_manage_project?
      flash[:alert] = "You don't have permission to manage this project."
      redirect_to root_path
    end
  end

  private

  def find_current_project
    return nil unless user_signed_in?

    # First try session
    if session[:current_project_id]
      project = current_user.projects.find_by(id: session[:current_project_id])
      return project if project
    end

    # Fall back to first project
    current_user.projects.first
  end
end
