require "rails_helper"

# Regression coverage for two bugs request specs can't see: a Turbo body-swap
# never reapplies the server-rendered <html data-theme>, and the settings
# preview board used to hardcode showCoordinates: false regardless of the
# saved preference. Both only show up with a real browser driving real JS.
RSpec.describe "Settings", type: :system do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:preferences) do
    {
      language: "en-US", theme: "light", board_theme: "default", piece_set: "standard",
      show_coordinates: false, board_animations: true, board_orientation_mode: "auto", sound: false
    }
  end

  def log_in
    stub_request(:post, "#{base}/auth/login").to_return(
      status: 200,
      body: { access_token: "token", refresh_token: "refresh" }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    stub_request(:get, "#{base}/auth/me").with(
      headers: { "Authorization" => "Bearer token" }
    ).to_return(
      status: 200,
      body: { id: 1, username: "coliver" }.to_json,
      headers: { "Content-Type" => "application/json" }
    )

    # Login's form isn't Turbo-intercepted, so the browser follows the
    # sessions#create redirect for real, landing on the dashboard before we
    # navigate on to settings — its own API calls need stubs too.
    stub_request(:get, "#{base}/progress/summary").to_return(
      status: 200,
      body: { positionsSeen: 0, overallAccuracy: 0, mastered: 0, openingBreakdown: [], currentStreak: 0, longestStreak: 0 }.to_json,
      headers: { "Content-Type" => "application/json" }
    )
    stub_request(:get, "#{base}/progress/due").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })
    stub_request(:get, "#{base}/progress/weak-spots").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })
    stub_request(:get, "#{base}/openings").to_return(status: 200, body: "[]", headers: { "Content-Type" => "application/json" })

    visit login_path
    fill_in "username", with: "coliver"
    fill_in "password", with: "secret"
    click_button "Submit"
  end

  # Stateful stub: PATCH mutates the same hash GET reads back, so a
  # Turbo-redirect reload after a save reflects the change instead of
  # reverting the preview to the pre-save preferences.
  def stub_preferences(preferences)
    current = preferences.dup
    stub_request(:get, "#{base}/users/me/preferences").to_return do
      { status: 200, body: current.to_json, headers: { "Content-Type" => "application/json" } }
    end
    stub_request(:patch, "#{base}/users/me/preferences").to_return do |request|
      current.merge!(JSON.parse(request.body).symbolize_keys)
      { status: 200, body: current.to_json, headers: { "Content-Type" => "application/json" } }
    end
  end

  before do
    stub_preferences(preferences)
    log_in
    visit settings_path
  end

  it "flips <html data-theme> immediately when dark is chosen, without a hard reload" do
    expect(page).to have_no_css("html[data-theme='dark']", visible: :all)

    choose "theme_dark"

    expect(page).to have_css("html[data-theme='dark']", visible: :all)
  end

  it "clears <html data-theme> when light is chosen after dark" do
    choose "theme_dark"
    expect(page).to have_css("html[data-theme='dark']", visible: :all)

    choose "theme_light"

    expect(page).to have_no_css("html[data-theme='dark']", visible: :all)
  end

  it "renders board coordinates in the preview once the toggle is enabled" do
    within(".settings-preview-board") do
      expect(page).to have_no_css(".coordinates .coordinate")
    end

    check "show_coordinates"

    within(".settings-preview-board") do
      expect(page).to have_css(".coordinates .coordinate")
    end
  end

  it "updates the preview board's theme class when a new board theme is chosen" do
    within(".settings-preview-board") do
      expect(page).to have_css("svg.cm-chessboard.default")
    end

    within("#settings-board-theme") { find("option[value='green']").select_option }

    within(".settings-preview-board") do
      expect(page).to have_css("svg.cm-chessboard.green")
    end
  end
end
