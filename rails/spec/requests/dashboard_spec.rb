require "rails_helper"

RSpec.describe "Dashboard", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  describe "GET /rails/dashboard" do
    it "redirects to login when no session" do
      get dashboard_path, env: env
      expect(response).to redirect_to(login_path)
    end

    it "renders dashboard with valid auth" do
      # Set up a session
      stub_request(:post, "#{base}/auth/login").to_return(
        status: 200,
        body: { access_token: "token", refresh_token: "refresh" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
      post login_path, params: { username: "coliver", password: "secret" }, env: env

      # Now stub the /auth/me endpoint
      stub_request(:get, "#{base}/auth/me").with(
        headers: { "Authorization" => "Bearer token" }
      ).to_return(
        status: 200,
        body: { id: 1, username: "coliver" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      stub_request(:get, "#{base}/progress/summary").to_return(
        status: 200,
        body: {
          positionsSeen: 0, overallAccuracy: 0, mastered: 0,
          openingBreakdown: [], currentStreak: 0, longestStreak: 0
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
      stub_request(:get, "#{base}/progress/due").to_return(
        status: 200, body: "[]", headers: { "Content-Type" => "application/json" }
      )
      stub_request(:get, "#{base}/progress/weak-spots").to_return(
        status: 200, body: "[]", headers: { "Content-Type" => "application/json" }
      )
      stub_request(:get, "#{base}/openings").to_return(
        status: 200,
        body: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ].to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get dashboard_path, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("coliver")
      expect(response.body).to include("Sicilian Defense")
    end

    it "redirects to login and clears session on invalid /auth/me response" do
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
        body: "<html>Invalid</html>",
        headers: { "Content-Type" => "text/html" }
      )

      get dashboard_path, env: env
      expect(response).to redirect_to(login_path)
      expect(session[:access_token]).to be_nil
    end
  end
end
