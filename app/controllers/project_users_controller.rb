# frozen_string_literal: true

class ProjectUsersController < ApplicationController
  before_action :authenticate_user!
  before_action :set_project
  before_action :require_project_owner!
  before_action :set_project_user, only: [:destroy]

  def index
    @project_users = @project.project_users.includes(:user, :invited_by)
  end

  def create
    email = params[:email]&.strip&.downcase

    if email.blank?
      redirect_to project_project_users_path(@project), alert: "Email is required."
      return
    end

    user = User.find_by(email: email)

    unless user
      redirect_to project_project_users_path(@project), alert: "No user found with that email address. They need to sign up first."
      return
    end

    if @project.project_users.exists?(user: user)
      redirect_to project_project_users_path(@project), alert: "User is already a member of this project."
      return
    end

    project_user = @project.project_users.build(
      user: user,
      invited_by: current_user
    )

    if project_user.save
      redirect_to project_project_users_path(@project), notice: "#{user.name || user.email} has been added to the project."
    else
      redirect_to project_project_users_path(@project), alert: "Failed to add user: #{project_user.errors.full_messages.join(', ')}"
    end
  end

  def destroy
    if @project_user.is_owner?
      redirect_to project_project_users_path(@project), alert: "Cannot remove the project owner."
      return
    end

    if @project_user.user == current_user
      redirect_to project_project_users_path(@project), alert: "You cannot remove yourself."
      return
    end

    user_name = @project_user.user.name || @project_user.user.email
    @project_user.destroy
    redirect_to project_project_users_path(@project), notice: "#{user_name} has been removed from the project."
  end

  private

  def set_project
    @project = Project.find(params[:project_id])
  end

  def require_project_owner!
    unless @project.user_can_manage?(current_user)
      flash[:alert] = "You don't have permission to manage project members."
      redirect_to @project
    end
  end

  def set_project_user
    @project_user = @project.project_users.find(params[:id])
  end
end
