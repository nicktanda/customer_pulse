class EmailRecipientsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_project_access!
  before_action :require_project_editor!, except: [:index]
  before_action :set_recipient, only: [:show, :edit, :update, :destroy]

  def index
    @recipients = current_project.email_recipients.order(:email)
  end

  def show
  end

  def new
    @recipient = current_project.email_recipients.build
  end

  def create
    @recipient = current_project.email_recipients.build(recipient_params)

    if @recipient.save
      redirect_to recipients_path, notice: "Recipient added successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @recipient.update(recipient_params)
      redirect_to recipients_path, notice: "Recipient updated successfully."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @recipient.destroy
    redirect_to recipients_path, notice: "Recipient removed."
  end

  private

  def set_recipient
    @recipient = current_project.email_recipients.find(params[:id])
  end

  def recipient_params
    params.require(:email_recipient).permit(:email, :name, :active)
  end
end
