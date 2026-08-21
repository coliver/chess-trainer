require "rails_helper"

describe AuthenticatedApiClient do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:session) { { access_token: "valid-token", refresh_token: "valid-refresh" } }
  let(:client) { AuthenticatedApiClient.new(session) }

  describe "#get" do
    it "passes through a successful response" do
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 200,
        body: { id: 1, username: "alice" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.get("/user")
      expect(response).to eq({ "id" => 1, "username" => "alice" })
    end

    it "refreshes token on 401 and retries with new token" do
      # First request returns 401
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 401,
        body: { detail: "Token expired" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      # Refresh call returns new token
      stub_request(:post, "#{base}/auth/refresh").with(
        body: { refresh_token: "valid-refresh" }.to_json,
        headers: { "Content-Type" => "application/json" }
      ).to_return(
        status: 200,
        body: { access_token: "fresh-token" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      # Retry with new token succeeds
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer fresh-token" }
      ).to_return(
        status: 200,
        body: { id: 1, username: "alice" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.get("/user")
      expect(response).to eq({ "id" => 1, "username" => "alice" })
      expect(session[:access_token]).to eq("fresh-token")
    end

    it "raises Unauthorized if retry is also 401" do
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 401,
        body: { detail: "Token expired" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      stub_request(:post, "#{base}/auth/refresh").to_return(
        status: 200,
        body: { access_token: "fresh-token" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer fresh-token" }
      ).to_return(
        status: 401,
        body: { detail: "Invalid token" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client.get("/user")
      }.to raise_error(AuthenticatedApiClient::Unauthorized)
    end

    it "raises Unauthorized if no refresh_token is present" do
      no_refresh_session = { access_token: "valid-token" }
      client_no_refresh = AuthenticatedApiClient.new(no_refresh_session)

      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 401,
        body: { detail: "Token expired" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client_no_refresh.get("/user")
      }.to raise_error(AuthenticatedApiClient::Unauthorized)

      expect(WebMock).not_to have_requested(:post, "#{base}/auth/refresh")
    end

    it "raises Unauthorized if refresh call returns 401" do
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 401,
        body: { detail: "Token expired" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      stub_request(:post, "#{base}/auth/refresh").to_return(
        status: 401,
        body: { detail: "Refresh token invalid" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client.get("/user")
      }.to raise_error(AuthenticatedApiClient::Unauthorized)
    end

    it "re-raises non-401 errors without refresh" do
      stub_request(:get, "#{base}/user").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 500,
        body: { detail: "Server error" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client.get("/user")
      }.to raise_error(ApiClient::ApiError) { |error|
        expect(error.status).to eq(500)
      }

      expect(WebMock).not_to have_requested(:post, "#{base}/auth/refresh")
    end
  end

  describe "#post" do
    it "passes through a successful response" do
      stub_request(:post, "#{base}/data").with(
        headers: { "Authorization" => "Bearer valid-token" }
      ).to_return(
        status: 200,
        body: { success: true }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.post("/data", body: { key: "value" })
      expect(response).to eq({ "success" => true })
    end
  end
end
