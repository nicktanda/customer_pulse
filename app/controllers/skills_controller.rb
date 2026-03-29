# frozen_string_literal: true

class SkillsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_skill, only: [:show, :edit, :update, :destroy]

  def index
    @skills = Skill.includes(:user).order(:title)
  end

  def show
  end

  def new
    @skill = Skill.new
  end

  def create
    @skill = current_user.skills.build(skill_params)

    if @skill.save
      redirect_to skills_path, notice: "Skill '#{@skill.title}' created and synced to filesystem."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @skill.update(skill_params)
      redirect_to skills_path, notice: "Skill '#{@skill.title}' updated and synced to filesystem."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    title = @skill.title
    @skill.destroy
    redirect_to skills_path, notice: "Skill '#{title}' deleted and removed from filesystem."
  end

  private

  def set_skill
    @skill = Skill.find(params[:id])
  end

  def skill_params
    params.require(:skill).permit(:name, :title, :description, :content)
  end
end
