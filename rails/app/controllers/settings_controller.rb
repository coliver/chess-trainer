class SettingsController < ApplicationController
  before_action :require_auth!

  THEMES = %w[light dark system].freeze
  BOARD_THEMES = %w[default default-contrast green blue chess-club chessboard-js black-and-white].freeze
  PIECE_SETS = %w[standard staunty merida pirouetti chessnut].freeze
  ORIENTATION_MODES = %w[auto white black].freeze

  BOARD_THEME_LABELS = {
    "default" => "Default",
    "default-contrast" => "Default (high contrast)",
    "green" => "Green",
    "blue" => "Blue",
    "chess-club" => "Chess Club",
    "chessboard-js" => "Classic",
    "black-and-white" => "Black & White"
  }.freeze

  PIECE_SET_LABELS = {
    "standard" => "Standard",
    "staunty" => "Staunty",
    "merida" => "Merida",
    "pirouetti" => "Pirouetti",
    "chessnut" => "Chessnut"
  }.freeze

  ORIENTATION_LABELS = {
    "auto" => "Auto — flip to the side to move",
    "white" => "Always keep White on bottom",
    "black" => "Always keep Black on bottom"
  }.freeze

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
    redirect_to settings_path, notice: "Preferences saved."
  rescue ApiClient::ApiError => e
    flash.now[:alert] = e.detail.presence || "Couldn't save preferences"
    @preferences = preferences_params.stringify_keys
    render :show, status: :unprocessable_entity
  end

  private

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
