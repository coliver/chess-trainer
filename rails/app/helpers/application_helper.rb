module ApplicationHelper
  # Flattens the "js" subtree of config/locales/en.yml into dot-path keys
  # (e.g. "puzzle.correct") and serializes it into the layout so Stimulus
  # controllers can look strings up via app/javascript/i18n.js's t(). Scoped
  # to just the "js" namespace rather than the whole locale file, since most
  # translations only ever render server-side.
  def js_translations
    flatten_translation_keys(I18n.t("js", default: {}))
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
