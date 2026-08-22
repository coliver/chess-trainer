class ApiClient
  class ApiError < StandardError
    attr_reader :status, :detail

    def initialize(status:, detail:)
      @status = status
      @detail = detail
      super(detail.to_s)
    end
  end

  def initialize(base_url: ENV.fetch("API_BASE_URL"))
    @conn = Faraday.new(url: base_url) do |f|
      f.request :json
      f.response :json, content_type: /\bjson$/
      f.adapter Faraday.default_adapter
    end
  end

  def get(path, params: {}, headers: {})
    request(:get, path, params: params, headers: headers)
  end

  def post(path, body: {}, headers: {})
    request(:post, path, body: body, headers: headers)
  end

  def patch(path, body: {}, headers: {})
    request(:patch, path, body: body, headers: headers)
  end

  private

  def request(method, path, params: {}, body: nil, headers: {})
    response = @conn.public_send(method, path) do |req|
      req.params.merge!(params) if params.present?
      req.body = body if body
      headers.each { |key, value| req.headers[key] = value }
    end

    unless response.success?
      detail = response.body.is_a?(Hash) ? response.body["detail"] : nil
      raise ApiError.new(status: response.status, detail: detail || "Request failed")
    end

    response.body
  end
end
