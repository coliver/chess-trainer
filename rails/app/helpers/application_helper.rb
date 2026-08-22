module ApplicationHelper
  # Serializes the *entire* current-locale translation set into the layout so
  # Stimulus controllers can look strings up via app/javascript/i18n.js's t().
  # Reuses the same generated file I18nJsonLoader already writes to
  # tmp/i18n_json_cache (shared-json keys plus this locale's Rails-only
  # additions from config/locales/en.yml, both already %{}-interpolation-ready),
  # unwraps its top-level locale key, and flattens it to dot-path keys (e.g.
  # "puzzles.correct"). There's no separate "js" namespace anymore — a view
  # and its Stimulus controller reference the literal same key. It's small
  # (~200 lines of JSON), so serializing the whole set isn't a bundle-size
  # concern. Nested plural hashes (the few dashboard keys using i18next's
  # _one/_other suffixes) flatten to keys like "dashboard.openings.matches.one" —
  # harmless since no current JS call site looks up a pluralized string.
  def js_translations
    cache_file = I18nJsonLoader::CACHE_DIR.join("#{I18n.locale}.json")
    data = JSON.parse(File.read(cache_file))
    flatten_translation_keys(data[I18n.locale.to_s] || {})
  rescue Errno::ENOENT, JSON::ParserError
    {}
  end

  def opening_preview_full_name(o)
    base = OpeningGrouping.base_name_of(o["name"])
    label = OpeningGrouping.variation_label_of(o["name"])
    label == "Main line" ? base : "#{base}: #{label}"
  end

  def opening_start_label(o)
    label = OpeningGrouping.variation_label_of(o["name"])
    label == "Main line" ? OpeningGrouping.base_name_of(o["name"]) : label
  end

  def opening_row_selected?(selected, o)
    selected && selected["eco"] == o["eco"] && selected["name"] == o["name"]
  end

  private

  def flatten_translation_keys(hash, prefix = nil)
    hash.each_with_object({}) do |(key, value), acc|
      path = prefix ? "#{prefix}.#{key}" : key.to_s
      if value.is_a?(Hash)
        acc.merge!(flatten_translation_keys(value, path))
      else
        acc[path] = value
      end
    end
  end
end
