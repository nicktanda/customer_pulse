# frozen_string_literal: true

class BusinessObjectivesController < ApplicationController
  before_action :authenticate_user!
  before_action :require_project_access!
  before_action :require_project_owner!, except: [ :index, :show ]
  before_action :set_objective, only: [ :show, :edit, :update, :destroy ]

  def index
    @objectives = current_project.business_objectives.by_priority
  end

  def show
  end

  def new
    @objective = current_project.business_objectives.build
  end

  def create
    @objective = current_project.business_objectives.build(objective_params)

    if @objective.save
      redirect_to @objective, notice: "Business objective created successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @objective.update(objective_params)
      redirect_to @objective, notice: "Business objective updated successfully."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @objective.destroy
    redirect_to business_objectives_path, notice: "Business objective deleted."
  end

  private

  def set_objective
    @objective = current_project.business_objectives.find(params[:id])
  end

  def objective_params
    params.require(:business_objective).permit(
      :title,
      :description,
      :objective_type,
      :priority,
      :status,
      :target_date,
      :success_metrics,
      :active
    )
  end
end
