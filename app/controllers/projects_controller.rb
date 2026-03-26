# frozen_string_literal: true

class ProjectsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_project, only: [:show, :edit, :update, :destroy, :switch]
  before_action :require_project_member!, only: [:show, :switch]
  before_action :require_project_owner_for_management!, only: [:edit, :update, :destroy]

  def index
    @projects = current_user.projects.includes(:project_users).alphabetical
  end

  def show
    @members = @project.project_users.includes(:user, :invited_by).order(:role)
    @stats = {
      feedbacks_count: @project.feedbacks.count,
      integrations_count: @project.integrations.count,
      insights_count: @project.insights.count,
      ideas_count: @project.ideas.count
    }
  end

  def new
    @project = Project.new
  end

  def create
    @project = Project.new(project_params)

    if @project.save
      # Add current user as owner
      @project.add_user(current_user, role: :owner)
      session[:current_project_id] = @project.id
      redirect_to @project, notice: "Project created successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @project.update(project_params)
      redirect_to @project, notice: "Project updated successfully."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    if @project.users.count == 1 || @project.project_users.owners.count > 1 || @project.project_users.owners.first.user != current_user
      @project.destroy
      session.delete(:current_project_id) if session[:current_project_id] == @project.id
      redirect_to projects_path, notice: "Project deleted."
    else
      redirect_to @project, alert: "Cannot delete a project where you are the sole owner. Transfer ownership first."
    end
  end

  def switch
    session[:current_project_id] = @project.id
    redirect_to root_path, notice: "Switched to #{@project.name}."
  end

  private

  def set_project
    @project = Project.find(params[:id])
  end

  def require_project_member!
    unless @project.project_users.exists?(user: current_user)
      flash[:alert] = "You don't have access to this project."
      redirect_to projects_path
    end
  end

  def require_project_owner_for_management!
    require_project_member!
    return if performed?

    unless @project.user_can_manage?(current_user)
      flash[:alert] = "You don't have permission to manage this project."
      redirect_to @project
    end
  end

  def project_params
    params.require(:project).permit(:name, :description)
  end
end
