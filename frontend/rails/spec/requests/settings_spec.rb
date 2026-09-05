require "rails_helper"

RSpec.describe "Settings", type: :request do
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

  def stub_get_preferences(status: 200, body: nil)
    body ||= {
      language: "en-US", theme: "dark", board_theme: "green", piece_set: "staunty",
      show_coordinates: true, board_animations: false, board_orientation_mode: "black", sound: true
    }
    payload = status == 200 ? body : { detail: "Server error" }
    stub_request(:get, "#{base}/users/me/preferences")
      .to_return(status: status, body: payload.to_json, headers: { "Content-Type" => "application/json" })
  end

  describe "GET /rails/settings" do
    it "redirects to login when there's no session" do
      get settings_path, env: env
      expect(response).to redirect_to(login_path)
    end

    context "when authenticated" do
      before { log_in }

      it "renders current preferences" do
        stub_get_preferences

        get settings_path, env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Settings")
      end

      it "renders an interactive preview board and a snow toggle" do
        stub_get_preferences

        get settings_path, env: env
        expect(response.body).to include('data-board-preview-interactive-value="true"')
        expect(response.body).to include('data-action="change->snow#toggle"')
      end

      it "falls back to defaults when the preferences fetch fails" do
        stub_get_preferences(status: 500)

        get settings_path, env: env
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Settings")
      end
    end
  end

  describe "PATCH /rails/settings" do
    before { log_in }

    it "forwards submitted preferences to the API and redirects with a notice" do
      stub_request(:patch, "#{base}/users/me/preferences")
        .with(body: hash_including("theme" => "dark"))
        .to_return(
          status: 200,
          body: {
            language: "en-US", theme: "dark", board_theme: "default", piece_set: "standard",
            show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
          }.to_json,
          headers: { "Content-Type" => "application/json" }
        )
      stub_get_preferences

      patch settings_path, params: { theme: "dark", show_coordinates: "1", board_animations: "1" }, env: env
      expect(response).to redirect_to(settings_path)
      follow_redirect!
      expect(response.body).to include("Preferences saved")
    end

    it "applies the saved language starting on the very next request" do
      fr_preferences = {
        language: "fr", theme: "system", board_theme: "default", piece_set: "standard",
        show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
      }
      stub_request(:patch, "#{base}/users/me/preferences")
        .with(body: hash_including("language" => "fr"))
        .to_return(status: 200, body: fr_preferences.to_json, headers: { "Content-Type" => "application/json" })
      stub_get_preferences(body: fr_preferences)

      patch settings_path, params: { language: "fr" }, env: env
      follow_redirect!

      expect(response.body).to include("Paramètres")
    end

    it "falls back to the default when an unsupported language is submitted" do
      stub_request(:patch, "#{base}/users/me/preferences")
        .with(body: hash_including("language" => "en-US"))
        .to_return(
          status: 200,
          body: {
            language: "en-US", theme: "system", board_theme: "default", piece_set: "standard",
            show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
          }.to_json,
          headers: { "Content-Type" => "application/json" }
        )
      stub_get_preferences

      patch settings_path, params: { language: "not-a-real-locale" }, env: env
      expect(response).to redirect_to(settings_path)
    end

    it "renders an error alert when the preferences update fails" do
      stub_request(:patch, "#{base}/users/me/preferences").to_return(
        status: 422,
        body: { detail: "Invalid preference value" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
      # The layout's header renders a theme-toggle form that reads
      # current_preferences independently of this action's own @preferences.
      stub_get_preferences

      patch settings_path, params: { theme: "invalid" }, env: env
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Invalid preference value")
    end
  end
end
