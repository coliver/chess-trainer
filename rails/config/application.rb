require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
# require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module App
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Don't generate system test files.
    config.generators.system_tests = nil

    # Available locales are derived from the same source directory React and
    # the backend read (packages/i18n-locales/locales/*.json), so adding a
    # locale file there is enough to make it selectable everywhere — no
    # separate allowlist to maintain. Locale ids match React's exactly
    # ("en-US", not "en") since both frontends load the same JSON files —
    # see config/initializers/i18n_json_loader.rb.
    config.i18n.default_locale = :"en-US"
    config.i18n.available_locales = Dir.glob(Rails.root.join("../packages/i18n-locales/locales/*.json"))
      .map { |path| File.basename(path, ".json").to_sym }
  end
end
