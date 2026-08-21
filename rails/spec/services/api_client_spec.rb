require "rails_helper"

describe ApiClient do
  let(:base_url) { "http://api:8000" }
  let(:client) { ApiClient.new(base_url: base_url) }

  describe "#get" do
    it "returns parsed JSON on 200 response" do
      stub_request(:get, "#{base_url}/test").to_return(
        status: 200,
        body: { data: "value" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.get("/test")
      expect(response).to eq({ "data" => "value" })
    end

    it "passes custom headers through" do
      stub_request(:get, "#{base_url}/test").with(
        headers: { "X-Custom-Header" => "custom-value" }
      ).to_return(
        status: 200,
        body: { ok: true }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.get("/test", headers: { "X-Custom-Header" => "custom-value" })
      expect(response).to eq({ "ok" => true })
    end

    it "raises ApiError on 401 with JSON detail" do
      stub_request(:get, "#{base_url}/protected").to_return(
        status: 401,
        body: { detail: "Invalid credentials" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client.get("/protected")
      }.to raise_error(ApiClient::ApiError) { |error|
        expect(error.status).to eq(401)
        expect(error.detail).to eq("Invalid credentials")
      }
    end

    it "raises ApiError on 500 with fallback detail" do
      stub_request(:get, "#{base_url}/error").to_return(
        status: 500,
        body: "",
        headers: { "Content-Type" => "text/plain" }
      )

      expect {
        client.get("/error")
      }.to raise_error(ApiClient::ApiError) { |error|
        expect(error.status).to eq(500)
        expect(error.detail).to eq("Request failed")
      }
    end
  end

  describe "#post" do
    it "sends JSON body" do
      stub_request(:post, "#{base_url}/login").with(
        body: { username: "test", password: "pass" }.to_json,
        headers: { "Content-Type" => "application/json" }
      ).to_return(
        status: 200,
        body: { token: "abc123" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      response = client.post("/login", body: { username: "test", password: "pass" })
      expect(response).to eq({ "token" => "abc123" })
    end

    it "raises ApiError on 401 with JSON detail" do
      stub_request(:post, "#{base_url}/login").to_return(
        status: 401,
        body: { detail: "Invalid credentials" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect {
        client.post("/login", body: { username: "test", password: "wrong" })
      }.to raise_error(ApiClient::ApiError) { |error|
        expect(error.status).to eq(401)
        expect(error.detail).to eq("Invalid credentials")
      }
    end
  end
end
