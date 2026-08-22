require "rails_helper"

RSpec.describe "Dashboard", type: :request do
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
  end

  def stub_auth_me(body: { id: 1, username: "coliver" }, content_type: "application/json")
    stub_request(:get, "#{base}/auth/me")
      .with(headers: { "Authorization" => "Bearer token" })
      .to_return(status: 200, body: body.is_a?(String) ? body : body.to_json, headers: { "Content-Type" => content_type })
  end

  def stub_dashboard_data(openings:, preferences_status: 200)
    stub_request(:get, "#{base}/progress/summary").to_return(
      status: 200,
      body: {
        positionsSeen: 0, overallAccuracy: 0, mastered: 0,
        openingBreakdown: [], currentStreak: 0, longestStreak: 0
      }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    stub_request(:get, "#{base}/progress/due").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })
    stub_request(:get, "#{base}/progress/weak-spots").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })
    stub_request(:get, "#{base}/openings").to_return(status: 200, body: openings.to_json, headers: { "Content-Type" => "application/json" })

    if preferences_status == 200
      stub_request(:get, "#{base}/users/me/preferences").to_return(
        status: 200,
        body: {
          language: "en-US", theme: "system", board_theme: "default", piece_set: "standard",
          show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
    else
      stub_request(:get, "#{base}/users/me/preferences").to_return(
        status: preferences_status, body: { detail: "Server error" }.to_json, headers: { "Content-Type" => "application/json" }
      )
    end
  end

  describe "GET /rails/dashboard" do
    it "redirects to login when there's no session" do
      get dashboard_path, env: env
      expect(response).to redirect_to(login_path)
    end

    context "when authenticated" do
      before { log_in }

      it "renders dashboard with progress and openings" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ])

        get dashboard_path, env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("coliver")
        expect(response.body).to include("Sicilian Defense")
      end

      it "redirects to login and clears the session on an invalid /auth/me response" do
        stub_auth_me(body: "<html>Invalid</html>", content_type: "text/html")

        get dashboard_path, env: env
        expect(response).to redirect_to(login_path)
        expect(session[:access_token]).to be_nil
      end

      it "renders the search view with matching openings" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil },
          { eco: "C60", name: "Ruy Lopez", epd: nil, pgn: nil, uci_moves: "", description: nil }
        ])

        get dashboard_path(q: "sicilian"), env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Sicilian Defense")
      end

      it "renders the variations view for a specific base opening" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil },
          { eco: "B90", name: "Sicilian Defense: Najdorf Variation", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5 g1f3", description: nil }
        ])

        get dashboard_path(base: "Sicilian Defense"), env: env
        expect(response).to have_http_status(:ok)
      end

      it "finds and displays a selected opening when eco and name params are given" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ])

        get dashboard_path(eco: "B20", name: "Sicilian Defense"), env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("B20")
      end

      it "still renders when the preferences API call fails" do
        stub_auth_me
        stub_dashboard_data(
          openings: [ { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil } ],
          preferences_status: 500
        )

        get dashboard_path, env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Sicilian Defense")
      end
    end
  end
end
