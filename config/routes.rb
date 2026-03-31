Rails.application.routes.draw do
  devise_for :users, controllers: { omniauth_callbacks: 'users/omniauth_callbacks' }

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
    post "jira", to: "jira#create"
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

    resources :projects do
      member do
        post :switch
      end
      resources :project_users, only: [:index, :create, :destroy], path: 'members'
    end

    resource :onboarding, only: [:show], controller: 'onboarding' do
      post :update_step
      post :test_connection
      post :complete
    end

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
      collection do
        post :sync_all
      end
      member do
        post :test_connection
        post :sync_now
      end
    end

    resources :recipients, controller: "email_recipients"

    resource :settings, only: [:show, :update] do
      post :save_github
      post :test_github
      post :save_anthropic
      post :test_anthropic
    end

    resources :pulse_reports, only: [:index, :show] do
      collection do
        post :generate
        post :generate_pr
      end
      member do
        post :resend
      end
    end

    resources :skills

  end

  # Unauthenticated root redirects to sign in
  unauthenticated do
    root "devise/sessions#new", as: :unauthenticated_root
  end
end
