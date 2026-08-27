require "json"
require "fileutils"

# Rails' I18n backend natively loads .json files from I18n.load_path (same
# as .yml), but expects them already in Ruby I18n's shape — locale as the
# top-level key, "%{var}" interpolation, "key: { one:, other: }"
# pluralization. React's react-i18next files (packages/i18n-locales/locales/)
# use i18next's shape instead — no locale wrapper, "{{var}}" interpolation,
# "key_one"/"key_other" suffix pairs. This transforms the former into the
# latter once at boot and writes the result into tmp/, then adds those
# generated files to I18n.load_path like any other locale file — so they
# participate in Rails' normal reload/caching behavior instead of a
# hand-rolled store_translations call that gets wiped by it.
#
# Genuinely Rails-only strings (no React equivalent) still live in
# config/locales/en.yml, loaded normally alongside this.
module I18nJsonLoader
  SOURCE_DIR = Rails.root.join("../packages/i18n-locales/locales")
  CACHE_DIR = Rails.root.join("tmp/i18n_json_cache")
  PLURAL_SUFFIXES = %w[zero one two few many other].freeze

  module_function

  def generate!
    FileUtils.mkdir_p(CACHE_DIR)

    Dir.glob(SOURCE_DIR.join("*.json")).each do |path|
      locale = File.basename(path, ".json")
      # Reads Rails.application.config.i18n.available_locales rather than
      # I18n.available_locales — the latter isn't populated from the former
      # yet at this point in boot (this initializer runs before the I18n
      # railtie applies config.i18n.* to the I18n module).
      next unless Rails.application.config.i18n.available_locales.map(&:to_s).include?(locale)

      data = JSON.parse(File.read(path))
      File.write(CACHE_DIR.join("#{locale}.json"), JSON.generate({ locale => transform(data) }))
    end
  end

  def transform(node)
    case node
    when Hash
      group_plurals(node).transform_values { |v| transform(v) }
    when String
      node.gsub(/\{\{\s*(\w+)\s*\}\}/, '%{\1}')
    else
      node
    end
  end

  def group_plurals(hash)
    hash.each_with_object({}) do |(key, value), result|
      base, suffix = split_plural_suffix(key)
      if suffix
        (result[base] ||= {})[suffix.to_sym] = value
      else
        result[key] = value
      end
    end
  end

  def split_plural_suffix(key)
    PLURAL_SUFFIXES.each do |suffix|
      tail = "_#{suffix}"
      return [ key.delete_suffix(tail), suffix ] if key.end_with?(tail)
    end
    [ key, nil ]
  end
end

I18nJsonLoader.generate!
Rails.application.config.i18n.load_path += Dir[I18nJsonLoader::CACHE_DIR.join("*.json")]
