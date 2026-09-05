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
    stub_request(:get, "#{base}/progress/step-accuracy").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })
    stub_request(:get, "#{base}/puzzles/summary").to_return(
      status: 200,
      body: { puzzlesSeen: 0, overallAccuracy: 0, mastered: 0 }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
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

      context "with weak-spot and trouble-step data" do
        before do
          stub_auth_me
          stub_dashboard_data(openings: [
            { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
          ])
          stub_request(:get, "#{base}/progress/weak-spots").to_return(
            status: 200,
            body: [
              { openingName: "Sicilian Defense", attempts: 10, correctCount: 4, incorrectCount: 6 },
              { openingName: "French Defense", attempts: 8, correctCount: 6, incorrectCount: 2 }
            ].to_json,
            headers: { "Content-Type" => "application/json" }
          )
          stub_request(:get, "#{base}/progress/step-accuracy").to_return(
            status: 200,
            body: [
              {
                openingName: "Sicilian Defense", orderIndex: 2, correctMoveUci: "g1f3",
                attempts: 10, correctCount: 3, incorrectCount: 7, accuracy: 0.3,
                commonWrongMoves: [ { moveUci: "b1c3", count: 5 } ]
              }
            ].to_json,
            headers: { "Content-Type" => "application/json" }
          )
          get dashboard_path, env: env
        end

        it "renders the weakest-opening tile" do
          expect(response.body).to include("ws-tile")
          expect(response.body).to include("40%") # weakest opening accuracy: 4/10
        end

        it "renders the trickiest-move tile with its top wrong move" do
          expect(response.body).to include("30%") # trickiest move accuracy
          expect(response.body).to include("b1c3")
        end

        it "renders the expand-to-see-all link" do
          expect(response.body).to include("See all")
        end
      end

      it "renders the puzzles progress-group section" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ])
        stub_request(:get, "#{base}/puzzles/summary").to_return(
          status: 200,
          body: { puzzlesSeen: 12, overallAccuracy: 0.75, mastered: 3 }.to_json,
          headers: { "Content-Type" => "application/json" }
        )

        get dashboard_path, env: env
        expect(response.body).to include("progress-group--puzzles")
        expect(response.body).to include("12")
        expect(response.body).to include("75%")
      end

      it "renders the mobile stat-tabs toggle" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ])

        get dashboard_path, env: env
        expect(response.body).to include("stat-tabs")
        expect(response.body).to include("data-controller=\"stat-tabs\"")
      end

      it "renders the popular-openings carousel when there are more base openings than fit one grid page" do
        stub_auth_me
        openings = (1..13).map { |i| { eco: "B#{10 + i}", name: "Opening #{i}", epd: nil, pgn: nil, uci_moves: "", description: nil } }
        stub_dashboard_data(openings: openings)

        get dashboard_path, env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("ob-carousel-section")
        expect(response.body).to include("opening-carousel")
      end

      it "does not render the carousel when there are few base openings" do
        stub_auth_me
        stub_dashboard_data(openings: [
          { eco: "B20", name: "Sicilian Defense", epd: nil, pgn: nil, uci_moves: "e2e4 c7c5", description: nil }
        ])

        get dashboard_path, env: env
        expect(response.body).not_to include("ob-carousel-section")
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
