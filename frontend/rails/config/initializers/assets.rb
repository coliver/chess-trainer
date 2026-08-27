# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = "1.0"

# Add additional assets to the asset load path.
# Rails.application.config.assets.paths << Emoji.images_path

# Rails is mounted at /rails behind nginx (see nginx/default.conf), so asset
# URLs must carry that prefix too.
Rails.application.config.assets.prefix = "/rails/assets"

# Reuse the shared, framework-neutral CSS package that React also uses.
Rails.application.config.assets.paths << Rails.root.join("../packages/shared-styles")
