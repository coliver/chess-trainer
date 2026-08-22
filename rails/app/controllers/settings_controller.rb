class SettingsController < ApplicationController
  before_action :require_auth!

  THEMES = %w[light dark system].freeze
  BOARD_THEMES = %w[default default-contrast green blue chess-club chessboard-js black-and-white].freeze
  PIECE_SETS = %w[standard staunty merida pirouetti chessnut].freeze
  ORIENTATION_MODES = %w[auto white black].freeze

  # Human-readable labels for the above live in the shared
  # packages/i18n-locales/locales/en-US.json under theme.*, settings.boardThemes.*,
  # settings.pieceSets.*, and settings.boardOrientation.* — the view looks
  # them up by value via t("settings.xxx.#{value}").

  DEFAULTS = {
    theme: "system",
    board_theme: "default",
    piece_set: "standard",
    show_coordinates: true,
    board_animations: true,
    board_orientation_mode: "auto",
    sound: false
  }.freeze

  def show
    @preferences = api.get("/users/me/preferences")
    session[:preferences] = @preferences
  rescue ApiClient::ApiError
    @preferences = DEFAULTS.stringify_keys
  end

  def update
    @preferences = api.patch("/users/me/preferences", body: preferences_params)
    session[:preferences] = @preferences
    redirect_to safe_return_to || settings_path, notice: t("settings.controller.preferences_saved")
  rescue ApiClient::ApiError => e
    flash.now[:alert] = e.detail.presence || t("settings.controller.save_failed")
    @preferences = preferences_params.stringify_keys
    render :show, status: :unprocessable_entity
  end

  private

  # Lets the header's theme-toggle button submit a preferences update from
  # any page and land back where it was, instead of always bouncing to
  # /rails/settings. Only ever a same-origin relative path.
  def safe_return_to
    path = params[:return_to]
    path if path.present? && path.start_with?("/") && !path.start_with?("//")
  end

  def preferences_params
    {
      theme: pick(params[:theme], THEMES, DEFAULTS[:theme]),
      board_theme: pick(params[:board_theme], BOARD_THEMES, DEFAULTS[:board_theme]),
      piece_set: pick(params[:piece_set], PIECE_SETS, DEFAULTS[:piece_set]),
      show_coordinates: bool(params[:show_coordinates]),
      board_animations: bool(params[:board_animations]),
      board_orientation_mode: pick(params[:board_orientation_mode], ORIENTATION_MODES, DEFAULTS[:board_orientation_mode]),
      sound: bool(params[:sound])
    }
  end

  def pick(value, allowed, default)
    allowed.include?(value) ? value : default
  end

  def bool(value)
    ActiveModel::Type::Boolean.new.cast(value) || false
  end
end
