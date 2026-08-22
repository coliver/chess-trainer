class RegistrationsController < ApplicationController
  def new
  end

  def create
    if params[:password] != params[:password_confirmation]
      @error = t("registrations.controller.password_mismatch")
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
    @error = e.detail.presence || t("registrations.controller.registration_failed")
    render :new, status: :unprocessable_entity
  end
end
