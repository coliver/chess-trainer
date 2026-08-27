# Ruby port of react/src/lib/groupOpenings.ts. Openings are plain hashes with
# string keys (as returned by GET /openings via ApiClient's JSON parsing):
# "eco", "name", "epd", "pgn", "uci_moves", "description".
class OpeningGrouping
  Group = Struct.new(:base, :representative, :eco, :members, :count, keyword_init: true)
  VariationGroup = Struct.new(:label, :rows, keyword_init: true)

  class << self
    def opening_key(o)
      "#{o["eco"]}#{o["name"]}"
    end

    def base_name_of(name)
      i = name.index(":")
      (i ? name[0...i] : name).strip
    end

    def color_of(base_name)
      base_name.match?(/defen[cs]e\b/i) ? "b" : "w"
    end

    def variation_label_of(name)
      base = base_name_of(name)
      return "Main line" if name.strip == base
      name[(name.index(":") + 1)..].strip
    end

    def sub_variation_label_of(name)
      label = variation_label_of(name)
      i = label.index(",")
      i ? label[(i + 1)..].strip : "Main line"
    end

    # Clusters a base opening's variation rows by the first comma-separated
    # segment of their label. "Main line" always sorts first; the rest by
    # size, then alphabetically.
    def group_variations(rows)
      buckets = {}
      rows.each do |o|
        label = variation_label_of(o["name"])
        sub = label == "Main line" ? label : label.split(",").first.strip
        (buckets[sub] ||= []) << o
      end

      groups = buckets.map { |label, group_rows| VariationGroup.new(label: label, rows: group_rows) }
      groups.sort! do |a, b|
        next -1 if a.label == "Main line"
        next 1 if b.label == "Main line"
        cmp = b.rows.size <=> a.rows.size
        cmp.zero? ? a.label <=> b.label : cmp
      end
      groups
    end

    # Groups by base name, sorted by size (most variations first, then
    # alphabetically). The representative is the bare root row (name == base)
    # when present, otherwise the member with the fewest plies.
    def group_by_base(openings)
      buckets = {}
      order = []
      openings.each do |o|
        base = base_name_of(o["name"])
        unless buckets.key?(base)
          buckets[base] = []
          order << base
        end
        buckets[base] << o
      end

      groups = order.map do |base|
        members = buckets[base]
        rep = members.find { |m| m["name"].strip == base }
        rep ||= members.min_by { |m| ply_count(m) }
        ordered = [ rep ] + members.reject { |m| m.equal?(rep) }
        Group.new(base: base, representative: rep, eco: rep["eco"], members: ordered, count: members.size)
      end

      groups.sort! do |a, b|
        cmp = b.count <=> a.count
        cmp.zero? ? a.base <=> b.base : cmp
      end
      groups
    end

    def ply_count(o)
      m = o["uci_moves"]&.strip
      m.present? ? m.split(/\s+/).size : 0
    end
  end
end
