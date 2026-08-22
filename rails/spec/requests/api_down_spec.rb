require "rails_helper"

RSpec.describe "API down", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  describe "POST /rails/resend-verification when API is down" do
    it "returns service unavailable and renders error page" do
      stub_request(:post, "#{base}/auth/resend-verification").to_raise(Faraday::ConnectionFailed.new("connection refused"))

      post resend_verification_path, params: { username: "coliver" }, env: env
      expect(response).to have_http_status(:service_unavailable)
      expect(response.body).to include("temporarily unreachable")
    end
  end
end
