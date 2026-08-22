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

  describe "GET /rails/settings" do
    it "redirects to login when no session" do
      get settings_path, env: env
      expect(response).to redirect_to(login_path)
    end

    it "renders current preferences" do
      log_in
      stub_request(:get, "#{base}/users/me/preferences").to_return(
        status: 200,
        body: {
          language: "en-US", theme: "dark", board_theme: "green", piece_set: "staunty",
          show_coordinates: true, board_animations: false, board_orientation_mode: "black", sound: true
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get settings_path, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Settings")
    end
  end

  describe "PATCH /rails/settings" do
    it "forwards submitted preferences to the API and redirects with a notice" do
      log_in
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
      stub_request(:get, "#{base}/users/me/preferences").to_return(
        status: 200,
        body: {
          language: "en-US", theme: "dark", board_theme: "default", piece_set: "standard",
          show_coordinates: true, board_animations: true, board_orientation_mode: "auto", sound: false
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      patch settings_path, params: { theme: "dark", show_coordinates: "1", board_animations: "1" }, env: env
      expect(response).to redirect_to(settings_path)
      follow_redirect!
      expect(response.body).to include("Preferences saved")
    end
  end
end
