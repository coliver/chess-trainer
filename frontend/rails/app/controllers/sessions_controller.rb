class SessionsController < ApplicationController
  def new
  end

  def create
    response = ApiClient.new.post("/auth/login", body: {
      username: params[:username],
      password: params[:password]
    })

    session[:access_token] = response["access_token"]
    session[:refresh_token] = response["refresh_token"]

    redirect_to dashboard_path
  rescue ApiClient::ApiError => e
    @username = params[:username]

    if e.status == 403 && e.detail == "Email not verified"
      @email_not_verified = true
    else
      @error = e.detail.presence || t("auth.login.errorLoginFailed")
    end

    render :new, status: :unprocessable_entity
  end

  def destroy
    reset_session
    redirect_to login_path
  end

  def resend_verification
    ApiClient.new.post("/auth/resend-verification", body: { username: params[:username] })
    redirect_to login_path, notice: t("sessions.controller.verification_sent")
  rescue ApiClient::ApiError => e
    redirect_to login_path, alert: e.detail.presence || t("sessions.controller.resend_failed")
  end
end
