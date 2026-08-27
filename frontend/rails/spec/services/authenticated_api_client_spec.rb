require "rails_helper"

RSpec.describe AuthenticatedApiClient do
  let(:base) { ENV.fetch("API_BASE_URL", "http://api:8000") }
  let(:session) { { access_token: "old-token", refresh_token: "refresh-token" } }
  let(:client) { described_class.new(session) }

  describe "#get" do
    context "when the request succeeds" do
      it "sends the current access token and returns the response" do
        stub_request(:get, "#{base}/progress/summary")
          .with(headers: { "Authorization" => "Bearer old-token" })
          .to_return(status: 200, body: { ok: true }.to_json, headers: { "Content-Type" => "application/json" })

        expect(client.get("/progress/summary")).to eq({ "ok" => true })
      end
    end

    context "when the request returns 401" do
      context "when refresh succeeds" do
        it "retries with the new token and returns the response" do
          stub_request(:get, "#{base}/progress/summary")
            .with(headers: { "Authorization" => "Bearer old-token" })
            .to_return(status: 401, body: { detail: "Unauthorized" }.to_json, headers: { "Content-Type" => "application/json" })
          stub_request(:post, "#{base}/auth/refresh")
            .with(body: { refresh_token: "refresh-token" }.to_json)
            .to_return(status: 200, body: { access_token: "new-token" }.to_json, headers: { "Content-Type" => "application/json" })
          stub_request(:get, "#{base}/progress/summary")
            .with(headers: { "Authorization" => "Bearer new-token" })
            .to_return(status: 200, body: { ok: true }.to_json, headers: { "Content-Type" => "application/json" })

          expect(client.get("/progress/summary")).to eq({ "ok" => true })
          expect(session[:access_token]).to eq("new-token")
        end
      end

      context "when the retry also returns 401" do
        it "raises Unauthorized" do
          stub_request(:get, "#{base}/progress/summary")
            .to_return(status: 401, body: { detail: "Unauthorized" }.to_json, headers: { "Content-Type" => "application/json" })
          stub_request(:post, "#{base}/auth/refresh")
            .to_return(status: 200, body: { access_token: "new-token" }.to_json, headers: { "Content-Type" => "application/json" })

          expect { client.get("/progress/summary") }.to raise_error(AuthenticatedApiClient::Unauthorized)
        end
      end

      context "when the retry returns a non-401 error" do
        it "re-raises the error without converting it to Unauthorized" do
          stub_request(:get, "#{base}/progress/summary")
            .to_return(
              { status: 401, body: { detail: "Unauthorized" }.to_json, headers: { "Content-Type" => "application/json" } },
              { status: 500, body: { detail: "Server error" }.to_json, headers: { "Content-Type" => "application/json" } }
            )
          stub_request(:post, "#{base}/auth/refresh")
            .to_return(status: 200, body: { access_token: "new-token" }.to_json, headers: { "Content-Type" => "application/json" })

          expect { client.get("/progress/summary") }.to raise_error(ApiClient::ApiError) { |e| expect(e.status).to eq(500) }
        end
      end

      context "without a refresh token" do
        it "raises Unauthorized immediately" do
          session[:refresh_token] = nil
          stub_request(:get, "#{base}/progress/summary")
            .to_return(status: 401, body: { detail: "Unauthorized" }.to_json, headers: { "Content-Type" => "application/json" })

          expect { client.get("/progress/summary") }.to raise_error(AuthenticatedApiClient::Unauthorized)
        end
      end

      context "when the refresh call itself fails" do
        it "raises Unauthorized" do
          stub_request(:get, "#{base}/progress/summary")
            .to_return(status: 401, body: { detail: "Unauthorized" }.to_json, headers: { "Content-Type" => "application/json" })
          stub_request(:post, "#{base}/auth/refresh")
            .to_return(status: 401, body: { detail: "Invalid refresh token" }.to_json, headers: { "Content-Type" => "application/json" })

          expect { client.get("/progress/summary") }.to raise_error(AuthenticatedApiClient::Unauthorized)
        end
      end
    end
  end
end
