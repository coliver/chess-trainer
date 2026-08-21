class TrainingsController < ApplicationController
  before_action :require_auth!

  def show
    @id = params[:id]
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
end
