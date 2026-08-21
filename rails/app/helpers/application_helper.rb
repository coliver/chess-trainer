module ApplicationHelper
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
end
