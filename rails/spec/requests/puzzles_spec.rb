require "rails_helper"

RSpec.describe "Puzzles", type: :request do
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

  describe "GET /rails/puzzles" do
    it "redirects to login when no session" do
      get puzzles_path, env: env
      expect(response).to redirect_to(login_path)
    end

    it "renders the puzzle board when a puzzle is due" do
      log_in
      stub_preferences
      stub_request(:get, "#{base}/puzzles/next").to_return(
        status: 200,
        body: {
          puzzleId: "puzzle-1", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          rating: 1500, themes: %w[fork middlegame], correctMoveUci: "e2e4", lastMoveUci: "d7d5"
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_path, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("puzzle-1")
    end

    it "shows the no-puzzles-due state on a 404" do
      log_in
      stub_preferences
      stub_request(:get, "#{base}/puzzles/next").to_return(
        status: 404, body: { detail: "No puzzles available" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_path, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("No puzzles due right now")
    end

    it "redirects to dashboard when the puzzle can't be loaded" do
      log_in
      stub_request(:get, "#{base}/puzzles/next").to_return(
        status: 500, body: { detail: "Server error" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_path, env: env
      expect(response).to redirect_to(dashboard_path)
    end
  end

  describe "GET /rails/puzzles?theme=" do
    it "forwards the theme to the API and shows the practicing pill" do
      log_in
      stub_preferences
      stub_request(:get, "#{base}/puzzles/next").with(query: { "theme" => "fork" }).to_return(
        status: 200,
        body: {
          puzzleId: "puzzle-1", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          rating: 1500, correctMoveUci: "e2e4", lastMoveUci: "d7d5"
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_path(theme: "fork"), env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("fork")
    end

    it "shows the theme-specific no-puzzles copy and a back-to-due-puzzles link on a 404" do
      log_in
      stub_preferences
      stub_request(:get, "#{base}/puzzles/next").with(query: { "theme" => "fork" }).to_return(
        status: 404, body: { detail: "No puzzles available" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_path(theme: "fork"), env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("No puzzles found for this theme")
      expect(response.body).to include(puzzles_path)
    end
  end

  describe "GET /rails/puzzles/themes" do
    it "redirects to login when no session" do
      get puzzle_themes_path, env: env
      expect(response).to redirect_to(login_path)
    end

    context "with theme counts from the API" do
      before do
        log_in
        stub_preferences
        stub_request(:get, "#{base}/puzzles/themes").to_return(
          status: 200,
          body: [ { theme: "fork", count: 42 }, { theme: "backRankMate", count: 7 } ].to_json,
          headers: { "Content-Type" => "application/json" }
        )
        get puzzle_themes_path, env: env
      end

      it "renders theme cards with their counts" do
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("fork")
        expect(response.body).to include("42")
      end

      it "formats camelCase theme names as spaced labels" do
        expect(response.body).to include("back Rank Mate")
      end
    end
  end

  describe "GET /rails/puzzles/next" do
    it "proxies the next puzzle as JSON" do
      log_in
      stub_request(:get, "#{base}/puzzles/next").to_return(
        status: 200, body: { puzzleId: "puzzle-2", fen: "start-fen" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_next_path, env: env
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["puzzleId"]).to eq("puzzle-2")
    end

    it "proxies API errors with their status" do
      log_in
      stub_request(:get, "#{base}/puzzles/next").to_return(
        status: 404, body: { detail: "No puzzles available" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_next_path, env: env
      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)["detail"]).to eq("No puzzles available")
    end

    it "forwards a theme query param to the API" do
      log_in
      stub_request(:get, "#{base}/puzzles/next").with(query: { "theme" => "fork" }).to_return(
        status: 200, body: { puzzleId: "puzzle-3", fen: "start-fen" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get puzzles_next_path(theme: "fork"), env: env
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["puzzleId"]).to eq("puzzle-3")
    end
  end

  describe "POST /rails/puzzles/:id/attempts" do
    it "proxies the attempt response as JSON" do
      log_in
      stub_request(:post, "#{base}/puzzles/1/attempts")
        .with(body: hash_including("move_uci" => "e2e4"))
        .to_return(status: 200, body: { correct: true, reason: nil, fenAfter: "fen-after" }.to_json,
                    headers: { "Content-Type" => "application/json" })

      post puzzles_attempts_path(1), params: { move_uci: "e2e4" }, env: env
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["correct"]).to be(true)
    end

    it "proxies API errors with their status" do
      log_in
      stub_request(:post, "#{base}/puzzles/1/attempts").to_return(
        status: 422, body: { detail: "Invalid move" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post puzzles_attempts_path(1), params: { move_uci: "z9z9" }, env: env
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)["detail"]).to eq("Invalid move")
    end
  end
end
