class RegistrationsController < ApplicationController
  def new
  end

  def create
    if params[:password] != params[:password_confirmation]
      @error = t("auth.register.passwordMismatch")
      return render :new, status: :unprocessable_entity
    end

    ApiClient.new.post("/auth/register", body: {
      email: params[:email],
      username: params[:username],
      password: params[:password],
      language: I18n.locale.to_s
    })

    @email = params[:email]
    render :created
  rescue ApiClient::ApiError => e
    @error = e.detail.presence || t("auth.register.errorGeneric")
    render :new, status: :unprocessable_entity
  end
end
