require "rails_helper"

RSpec.describe "Sessions", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  describe "GET /rails/login" do
    it "returns 200" do
      get login_path, env: env
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /rails/login" do
    it "redirects to dashboard and sets session on successful login" do
      stub_request(:post, "#{base}/auth/login").with(
        body: { username: "coliver", password: "secret" }.to_json,
        headers: { "Content-Type" => "application/json" }
      ).to_return(
        status: 200,
        body: { access_token: "a", refresh_token: "r" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post login_path, params: { username: "coliver", password: "secret" }, env: env
      expect(response).to redirect_to(dashboard_path)

      expect(session[:access_token]).to eq("a")
      expect(session[:refresh_token]).to eq("r")
    end

    it "returns 422 with email not verified error" do
      stub_request(:post, "#{base}/auth/login").to_return(
        status: 403,
        body: { detail: "Email not verified" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post login_path, params: { username: "coliver", password: "secret" }, env: env
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to match(/verify your email/i)
    end

    it "returns 422 with invalid credentials error" do
      stub_request(:post, "#{base}/auth/login").to_return(
        status: 401,
        body: { detail: "Invalid credentials" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post login_path, params: { username: "coliver", password: "wrong" }, env: env
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Invalid credentials")
    end
  end

  describe "DELETE /rails/logout" do
    it "clears session and redirects to login" do
      stub_request(:post, "#{base}/auth/login").to_return(
        status: 200,
        body: { access_token: "a", refresh_token: "r" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
      post login_path, params: { username: "coliver", password: "secret" }, env: env

      delete logout_path, env: env
      expect(response).to redirect_to(login_path)
      expect(session[:access_token]).to be_nil
    end
  end

  describe "POST /rails/resend-verification" do
    it "redirects to login with notice" do
      stub_request(:post, "#{base}/auth/resend-verification").to_return(
        status: 200,
        body: { success: true }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post resend_verification_path, params: { username: "coliver" }, env: env
      expect(response).to redirect_to(login_path)
      follow_redirect!
      expect(flash[:notice]).to eq("If that account exists and is unverified, a verification email has been sent.")
    end
  end
end
