class RegistrationsController < ApplicationController
  def new
  end

  def create
    if params[:password] != params[:password_confirmation]
      @error = "Passwords do not match"
      return render :new, status: :unprocessable_entity
    end

    ApiClient.new.post("/auth/register", body: {
      email: params[:email],
      username: params[:username],
      password: params[:password],
      language: "en-US"
    })

    @email = params[:email]
    render :created
  rescue ApiClient::ApiError => e
    @error = e.detail.presence || "Registration failed"
    render :new, status: :unprocessable_entity
  end
end
