require "rails_helper"

RSpec.describe "Trainings", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  def log_in
    stub_request(:post, "#{base}/auth/login").to_return(
      status: 200,
      body: { access_token: "token", refresh_token: "refresh" }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    post login_path, params: { username: "coliver", password: "secret" }, env: env

    stub_request(:get, "#{base}/auth/me").with(
      headers: { "Authorization" => "Bearer token" }
    ).to_return(
      status: 200,
      body: { id: 1, username: "coliver" }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
  end

  def stub_preferences
    stub_request(:get, "#{base}/users/me/preferences").to_return(
      status: 200,
      body: {
        language: "en-US", theme: "system", board_theme: "default", piece_set: "standard",
        show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
      }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
  end

  describe "GET /rails/trainings/:id" do
    it "redirects to login when no session" do
      get training_path(1), env: env
      expect(response).to redirect_to(login_path)
    end

    it "renders the training board" do
      log_in
      stub_preferences
      stub_request(:get, "#{base}/training-sessions/1/next").to_return(
        status: 200,
        body: {
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          itemId: "item-1", correctMoveUci: "e2e4", playerColor: "w",
          openingName: "Sicilian Defense", openingEco: "B20"
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get training_path(1), env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Sicilian Defense")
    end

    it "redirects to dashboard when the session can't be loaded" do
      log_in
      stub_request(:get, "#{base}/training-sessions/1/next").to_return(
        status: 404, body: { detail: "Not found" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get training_path(1), env: env
      expect(response).to redirect_to(dashboard_path)
    end
  end

  describe "POST /rails/trainings" do
    it "starts a session for a chosen opening and redirects into it" do
      log_in
      stub_request(:post, "#{base}/training-sessions")
        .with(body: hash_including("opening_eco" => "B20"))
        .to_return(status: 200, body: { id: 42 }.to_json, headers: { "Content-Type" => "application/json" })

      post trainings_path, params: { opening_eco: "B20", opening_name: "Sicilian Defense", player_color: "w" }, env: env
      expect(response).to redirect_to(training_path(42))
    end

    it "starts a session from due items" do
      log_in
      stub_request(:post, "#{base}/training-sessions/from-due")
        .to_return(status: 200, body: { id: 7 }.to_json, headers: { "Content-Type" => "application/json" })

      post trainings_path, params: { from_due: true }, env: env
      expect(response).to redirect_to(training_path(7))
    end

    it "redirects to dashboard when the session can't be started" do
      log_in
      stub_request(:post, "#{base}/training-sessions")
        .to_return(status: 422, body: { detail: "No such opening" }.to_json, headers: { "Content-Type" => "application/json" })

      post trainings_path, params: { opening_eco: "ZZ9", opening_name: "Nope", player_color: "w" }, env: env
      expect(response).to redirect_to(dashboard_path)
    end
  end

  describe "GET /rails/trainings/:id/next" do
    it "proxies the next item as JSON" do
      log_in
      stub_request(:get, "#{base}/training-sessions/1/next").to_return(
        status: 200, body: { fen: "start-fen", itemId: "item-2" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get training_next_path(1), env: env
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["itemId"]).to eq("item-2")
    end

    it "proxies API errors with their status" do
      log_in
      stub_request(:get, "#{base}/training-sessions/1/next").to_return(
        status: 404, body: { detail: "Not found" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get training_next_path(1), env: env
      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)["detail"]).to eq("Not found")
    end
  end

  describe "POST /rails/trainings/:id/moves" do
    it "proxies the move response as JSON" do
      log_in
      stub_request(:post, "#{base}/training-sessions/1/responses")
        .with(body: hash_including("move_uci" => "e2e4", "item_id" => "item-1"))
        .to_return(status: 200, body: { correct: true }.to_json, headers: { "Content-Type" => "application/json" })

      post training_moves_path(1), params: { move_uci: "e2e4", item_id: "item-1" }, env: env
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["correct"]).to be(true)
    end

    it "proxies API errors with their status" do
      log_in
      stub_request(:post, "#{base}/training-sessions/1/responses").to_return(
        status: 422, body: { detail: "Invalid move" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post training_moves_path(1), params: { move_uci: "z9z9", item_id: "item-1" }, env: env
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["detail"]).to eq("Invalid move")
    end
  end
end
