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
    get "settings" => "settings#show", as: :settings
    patch "settings" => "settings#update"

    get "trainings/:id" => "trainings#show", as: :training
    post "trainings" => "trainings#create", as: :trainings
    get "trainings/:id/next" => "trainings#next_item", as: :training_next
    post "trainings/:id/moves" => "trainings#create_response", as: :training_moves

    get "puzzles" => "puzzles#show", as: :puzzles
    get "puzzles/themes" => "puzzles#themes", as: :puzzle_themes
    get "puzzles/next" => "puzzles#next_puzzle", as: :puzzles_next
    post "puzzles/:id/attempts" => "puzzles#create_attempt", as: :puzzles_attempts

    root "sessions#new"
  end
end
