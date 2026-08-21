class TrainingsController < ApplicationController
  before_action :require_auth!

  def show
    @training_id = params[:id]
    item = api.get("/training-sessions/#{@training_id}/next")

    @fen = item["fen"]
    @item_id = item["itemId"]
    @correct_move_uci = item["correctMoveUci"]
    @player_color = item["playerColor"] == "b" ? "b" : "w"
    @opening_name = item["openingName"].presence || "Training"
    @eco = item["openingEco"]
  rescue ApiClient::ApiError => e
    redirect_to dashboard_path, alert: e.detail.presence || "Could not load training session"
  end

  def create
    response =
      if params[:from_due].present?
        api.post("/training-sessions/from-due")
      else
        api.post("/training-sessions", body: {
          opening_eco: params[:opening_eco],
          opening_name: params[:opening_name],
          player_color: params[:player_color].presence || "w"
        })
      end

    redirect_to training_path(response["id"])
  rescue ApiClient::ApiError => e
    redirect_to dashboard_path, alert: e.detail.presence || "Could not start training session"
  end

  # JSON proxy for the training board's Stimulus controller: it can't reach
  # FastAPI directly (the access token lives server-side in the session), so
  # it fetches the next item through this thin endpoint instead.
  def next_item
    item = api.get("/training-sessions/#{params[:id]}/next")
    render json: item
  rescue ApiClient::ApiError => e
    render json: { detail: e.detail }, status: e.status
  end

  # JSON proxy for move submission (POST /rails/trainings/:id/moves).
  def create_response
    result = api.post("/training-sessions/#{params[:id]}/responses", body: {
      move_uci: params[:move_uci],
      item_id: params[:item_id]
    })
    render json: result
  rescue ApiClient::ApiError => e
    render json: { detail: e.detail }, status: e.status
  end
end
