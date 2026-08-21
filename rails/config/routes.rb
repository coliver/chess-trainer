Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  scope "/rails" do
    get "ping" => "pings#show"

    get "login" => "sessions#new", as: :login
    post "login" => "sessions#create"
    delete "logout" => "sessions#destroy", as: :logout
    post "resend-verification" => "sessions#resend_verification", as: :resend_verification

    get "register" => "registrations#new", as: :register
    post "register" => "registrations#create"

    get "verify-email" => "email_verifications#show", as: :verify_email

    get "dashboard" => "dashboard#show", as: :dashboard

    root "sessions#new"
  end
end
