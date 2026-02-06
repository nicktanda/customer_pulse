Rails.application.routes.draw do
  devise_for :users

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # Sidekiq web UI (admin only)
  require "sidekiq/web"
  require "sidekiq/cron/web"
  authenticate :user, ->(user) { user.admin? } do
    mount Sidekiq::Web => "/sidekiq"
  end

  # Webhooks (no authentication)
  namespace :webhooks do
    post "linear", to: "linear#create"
    post "slack", to: "slack#create"
  end

  # API endpoints
  namespace :api do
    namespace :v1 do
      resources :feedback, only: [:create]
    end
  end

  # Authenticated routes
  authenticate :user do
    root "dashboard#index"

    resources :feedback, only: [:index, :show, :update] do
      member do
        patch :override
        post :reprocess
      end
      collection do
        post :bulk_update
      end
    end

    resources :integrations do
      member do
        post :test_connection
        post :sync_now
      end
    end

    resources :recipients, controller: "email_recipients"

    resource :settings, only: [:show, :update]

    resources :pulse_reports, only: [:index, :show] do
      member do
        post :resend
      end
    end
  end

  # Unauthenticated root redirects to sign in
  unauthenticated do
    root "devise/sessions#new", as: :unauthenticated_root
  end
end
