class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  rescue_from "AuthenticatedApiClient::Unauthorized", with: :handle_unauthorized
  rescue_from Faraday::ConnectionFailed, Faraday::TimeoutError, with: :handle_api_down

  around_action :set_locale

  helper_method :logged_in?, :current_preferences

  private

  # Mirrors React's PreferencesContext effect that calls i18n.changeLanguage
  # on the stored preference — here it's per-request instead of per-mount.
  # Reads session[:preferences] directly rather than through
  # current_preferences: this runs ahead of require_auth! for every request,
  # so it must never itself trigger the preferences API call (that would add
  # a network round trip before auth is even checked, and fire on every JSON
  # move/attempt proxy too). It's a no-op until something else in the
  # request cycle populates session[:preferences] (any full-page render, or
  # a settings save) — from then on, this reads the cached value. Falls back
  # to the default when unset or no longer a locale we actually ship, same
  # guard as React's LanguageToggle#toLanguage.
  def set_locale
    locale = session[:preferences] && session[:preferences]["language"]
    locale = I18n.default_locale.to_s unless locale && I18n.available_locales.map(&:to_s).include?(locale)
    I18n.with_locale(locale) { yield }
  end

  def logged_in?
    session[:access_token].present?
  end

  def current_preferences
    return SettingsController::DEFAULTS.stringify_keys unless logged_in?

    session[:preferences] ||= begin
      api.get("/users/me/preferences")
    rescue ApiClient::ApiError
      SettingsController::DEFAULTS.stringify_keys
    end
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
