class AuthenticatedApiClient
  class Unauthorized < StandardError; end

  def initialize(session)
    @session = session
    @client = ApiClient.new
  end

  def get(path, params: {})
    with_refresh { @client.get(path, params: params, headers: auth_headers) }
  end

  def post(path, body: {})
    with_refresh { @client.post(path, body: body, headers: auth_headers) }
  end

  def patch(path, body: {})
    with_refresh { @client.patch(path, body: body, headers: auth_headers) }
  end

  private

  def auth_headers
    { "Authorization" => "Bearer #{@session[:access_token]}" }
  end

  def with_refresh
    yield
  rescue ApiClient::ApiError => e
    raise e unless e.status == 401

    refresh!

    begin
      yield
    rescue ApiClient::ApiError => retry_error
      raise Unauthorized if retry_error.status == 401
      raise
    end
  end

  def refresh!
    raise Unauthorized unless @session[:refresh_token]

    response = @client.post("/auth/refresh", body: { refresh_token: @session[:refresh_token] })
    @session[:access_token] = response["access_token"]
  rescue ApiClient::ApiError
    raise Unauthorized
  end
end
