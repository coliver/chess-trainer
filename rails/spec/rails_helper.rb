# This file is copied to spec/ when you run 'rails generate rspec:install'
require 'spec_helper'
# docker-compose.yml sets RAILS_ENV=development container-wide (for bin/dev),
# which would otherwise win over ||= here and silently run specs against the
# development environment (forgery protection on, web-console loaded, etc).
ENV['RAILS_ENV'] = 'test'
require_relative '../config/environment'
# Prevent database truncation if the environment is production
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'
require 'webmock/rspec'
require 'capybara/rspec'
require 'capybara/cuprite'
# Add additional requires below this line. Rails is not loaded until this point!

# Headless Chrome via CDP/Ferrum for spec/system — no selenium/chromedriver
# version coupling. `disable-dev-shm-usage` avoids Chrome crashing against
# Docker's small default /dev/shm instead of raising shm_size in compose.
Capybara.register_driver(:cuprite) do |app|
  Capybara::Cuprite::Driver.new(
    app,
    window_size: [1200, 800],
    browser_options: { "no-sandbox" => nil, "disable-dev-shm-usage" => nil },
    process_timeout: 15
  )
end
Capybara.default_driver = :rack_test
Capybara.javascript_driver = :cuprite

# Requires supporting ruby files with custom matchers and macros, etc, in
# spec/support/ and its subdirectories. Files matching `spec/**/*_spec.rb` are
# run as spec files by default. This means that files in spec/support that end
# in _spec.rb will both be required and run as specs, causing the specs to be
# run twice. It is recommended that you do not name files matching this glob to
# end with _spec.rb. You can configure this pattern with the --pattern
# option on the command line or in ~/.rspec, .rspec or `.rspec-local`.
#
# The following line is provided for convenience purposes. It has the downside
# of increasing the boot-up time by auto-requiring all files in the support
# directory. Alternatively, in the individual `*_spec.rb` files, manually
# require only the support files necessary.
#
Rails.root.glob('spec/support/**/*.rb').sort_by(&:to_s).each { |f| require f }

RSpec.configure do |config|
  # Remove this line to enable support for ActiveRecord
  config.use_active_record = false

  WebMock.disable_net_connect!(allow_localhost: true)

  # ActionDispatch::HostAuthorization blocks unrecognized Host headers (403).
  # RSpec request specs default to Host "www.example.com", which isn't in
  # config.hosts (only .localhost/.test/any IP) — use an allowed host instead.
  config.before(:each, type: :request) do
    host! "localhost"
  end

  config.before(:each, type: :system) { driven_by :cuprite }

  # If you enable ActiveRecord support you should uncomment these lines,
  # note if you'd prefer not to run each example within a transaction, you
  # should set use_transactional_fixtures to false.
  #
  # config.fixture_paths = [
  #   Rails.root.join('spec/fixtures')
  # ]
  # config.use_transactional_fixtures = true

  # RSpec Rails uses metadata to mix in different behaviours to your tests,
  # for example enabling you to call `get` and `post` in request specs. e.g.:
  #
  #     RSpec.describe UsersController, type: :request do
  #       # ...
  #     end
  #
  # The different available types are documented in the features, such as in
  # https://rspec.info/features/8-0/rspec-rails
  #
  # You can also infer these behaviours automatically by location, e.g.
  # /spec/models would pull in the same behaviour as `type: :model` but this
  # behaviour is considered legacy and will be removed in a future version.
  #
  # To enable this behaviour uncomment the line below.
  # config.infer_spec_type_from_file_location!

  # Filter lines from Rails gems in backtraces.
  config.filter_rails_from_backtrace!
  # arbitrary gems may also be filtered via:
  # config.filter_gems_from_backtrace("gem name")
end
