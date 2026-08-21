class EmailVerificationsController < ApplicationController
  def show
    token = params[:token]

    if token.blank?
      @state = :error
      return
    end

    response = ApiClient.new.get("/auth/verify-email", params: { token: token })
    @email = response["email"]
    @state = :success
  rescue ApiClient::ApiError
    @state = :error
  end
end
