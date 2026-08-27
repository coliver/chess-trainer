module ApplicationHelper
  # Serializes the *entire* current-locale translation set into the layout so
  # Stimulus controllers can look strings up via app/javascript/i18n.js's t().
  # Reads straight from I18n's own in-memory store (which already merges the
  # I18nJsonLoader-generated shared-json keys with this locale's Rails-only
  # additions from config/locales/en.yml — both loaded via config.i18n.load_path,
  # both already %{}-interpolation-ready) and flattens it to dot-path keys
  # (e.g. "puzzles.correct"). There's no separate "js" namespace anymore — a
  # view and its Stimulus controller reference the literal same key. It's
  # small (~200 lines), so serializing the whole set isn't a bundle-size
  # concern. Nested plural hashes (the few dashboard keys using i18next's
  # _one/_other suffixes) flatten to keys like "dashboard.openings.matches.one" —
  # harmless since no current JS call site looks up a pluralized string.
  def js_translations
    backend = I18n.backend
    backend.send(:init_translations) unless backend.initialized?
    flatten_translation_keys(backend.translations[I18n.locale] || {})
  rescue StandardError
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
