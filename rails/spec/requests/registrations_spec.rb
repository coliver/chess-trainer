require "rails_helper"

RSpec.describe "Registrations", type: :request do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:user_agent) { "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  let(:env) { { "HTTP_USER_AGENT" => user_agent } }

  describe "GET /rails/register" do
    it "returns 200" do
      get register_path, env: env
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /rails/register" do
    it "renders created on successful registration" do
      stub_request(:post, "#{base}/auth/register").with(
        body: {
          email: "a@example.com",
          username: "a",
          password: "secret",
          language: "en-US"
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      ).to_return(
        status: 200,
        body: { id: 1, email: "a@example.com", username: "a" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post register_path, params: {
        email: "a@example.com",
        username: "a",
        password: "secret",
        password_confirmation: "secret"
      }, env: env

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("a@example.com")
    end

    it "returns 422 with mismatched passwords without calling API" do
      post register_path, params: {
        email: "a@example.com",
        username: "a",
        password: "secret",
        password_confirmation: "different"
      }, env: env

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Passwords do not match")
      expect(WebMock).not_to have_requested(:post, "#{base}/auth/register")
    end

    it "returns 422 with existing email error" do
      stub_request(:post, "#{base}/auth/register").to_return(
        status: 409,
        body: { detail: "Email or username already exists" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      post register_path, params: {
        email: "existing@example.com",
        username: "existing",
        password: "secret",
        password_confirmation: "secret"
      }, env: env

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("Email or username already exists")
    end
  end
end
