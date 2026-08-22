class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  rescue_from "AuthenticatedApiClient::Unauthorized", with: :handle_unauthorized
  rescue_from Faraday::ConnectionFailed, Faraday::TimeoutError, with: :handle_api_down

  helper_method :logged_in?

  private

  def logged_in?
    session[:access_token].present?
  end

  def require_auth!
    unless session[:access_token]
      redirect_to login_path
      return
    end

    me = api.get("/auth/me")
    unless me.is_a?(Hash) && me["id"].present? && me["username"].is_a?(String)
      raise AuthenticatedApiClient::Unauthorized
    end

    @current_user = me
  end

  def api
    @api ||= AuthenticatedApiClient.new(session)
  end

  def handle_unauthorized
    reset_session
    redirect_to login_path
  end

  def handle_api_down
    render "errors/api_down", status: :service_unavailable
  end
end
