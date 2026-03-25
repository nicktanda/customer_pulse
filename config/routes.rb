Rails.application.routes.draw do
  devise_for :users
  root "dashboard#index"

  get "up" => "rails/health#show", as: :rails_health_check
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  get "/dashboard", to: "dashboard#index"
  get "/onboarding", to: "onboarding#index"
  post "/onboarding/complete", to: "onboarding#complete"

  resources :feedback do
    collection do
      patch :bulk_update
      get :export_csv
    end
    member do
      patch :override
      post :reprocess
    end
  end

  resources :integrations do
    member do
      post :test_connection
      post :sync_now
    end
    collection do
      post :sync_all
    end
  end

  resources :pulse_reports, only: [:index, :show] do
    member do
      post :send_now
    end
  end

  resources :email_recipients, as: :recipients

  get "/settings", to: "settings#show"
  patch "/settings", to: "settings#update"
  post "/settings/save_github", to: "settings#save_github"
  post "/settings/test_github", to: "settings#test_github"
  delete "/settings/disconnect_github", to: "settings#disconnect_github"

  namespace :api do
    namespace :v1 do
      resources :feedback, only: [:create, :index]
    end
  end

  namespace :webhooks do
    post :linear, to: "linear#create"
    post :slack, to: "slack#create"
    post :jira, to: "jira#create"
  end
end