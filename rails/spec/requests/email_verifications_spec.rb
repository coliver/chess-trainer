require "rails_helper"

RSpec.describe "Email Verifications", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  describe "GET /rails/verify-email" do
    it "shows email on successful verification" do
      stub_request(:get, "#{base}/auth/verify-email").with(
        query: { token: "good-token" }
      ).to_return(
        status: 200,
        body: { email: "a@example.com", verified: true }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get verify_email_path, params: { token: "good-token" }, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("a@example.com")
    end

    it "shows invalid message on bad token" do
      stub_request(:get, "#{base}/auth/verify-email").with(
        query: { token: "bad-token" }
      ).to_return(
        status: 400,
        body: { detail: "Token is invalid or has expired" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      get verify_email_path, params: { token: "bad-token" }, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body.downcase).to match(/invalid or has expired/)
    end

    it "shows invalid message and doesn't call API when token is missing" do
      get verify_email_path, env: env
      expect(response).to have_http_status(:ok)
      expect(response.body.downcase).to match(/invalid or has expired/)
      expect(WebMock).not_to have_requested(:get, %r{#{base}/auth/verify-email})
    end
  end
end
