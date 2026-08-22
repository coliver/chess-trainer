class PuzzlesController < ApplicationController
  before_action :require_auth!

  def show
    assign_puzzle(api.get("/puzzles/next"))
  rescue ApiClient::ApiError => e
    if e.status == 404
      @no_puzzle = true
    else
      # Rails-only key: this is a flash+redirect, a different flow shape than
      # React's inline puzzles.loadFailed retry UI, so it doesn't share a key.
      redirect_to dashboard_path, alert: e.detail.presence || t("puzzles.controller.could_not_load")
    end
  end

  # JSON proxy for the puzzle board's Stimulus controller (see trainings#next_item).
  def next_puzzle
    render json: api.get("/puzzles/next")
  rescue ApiClient::ApiError => e
    render json: { detail: e.detail }, status: e.status
  end

  # JSON proxy for attempt submission (POST /rails/puzzles/:id/attempts).
  def create_attempt
    render json: api.post("/puzzles/#{params[:id]}/attempts", body: { move_uci: params[:move_uci] })
  rescue ApiClient::ApiError => e
    render json: { detail: e.detail }, status: e.status
  end

  private

  def assign_puzzle(puzzle)
    @puzzle_id = puzzle["puzzleId"]
    @fen = puzzle["fen"]
    @rating = puzzle["rating"]
    @correct_move_uci = puzzle["correctMoveUci"]
    @last_move_uci = puzzle["lastMoveUci"]

    prefs = current_preferences
    @board_theme = prefs["board_theme"]
    @piece_set = prefs["piece_set"]
    @show_coordinates = prefs["show_coordinates"]
    @board_animations = prefs["board_animations"]
    @board_orientation_mode = prefs["board_orientation_mode"]
    @sound_enabled = prefs["sound"]
  end
end
