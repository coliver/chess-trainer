require "rails_helper"

RSpec.describe OpeningGrouping do
  describe ".opening_key" do
    it "concatenates eco and name" do
      expect(described_class.opening_key({ "eco" => "B20", "name" => "Sicilian Defense" })).to eq("B20Sicilian Defense")
    end
  end

  describe ".base_name_of" do
    context "when name has no colon" do
      it "returns the name unchanged" do
        expect(described_class.base_name_of("Sicilian Defense")).to eq("Sicilian Defense")
      end
    end

    context "when name has a colon" do
      it "returns everything before the colon, trimmed" do
        expect(described_class.base_name_of("Sicilian Defense: Najdorf Variation")).to eq("Sicilian Defense")
      end
    end
  end

  describe ".color_of" do
    context "when name ends in Defense" do
      it "returns b" do
        expect(described_class.color_of("Sicilian Defense")).to eq("b")
      end
    end

    context "when name ends in Defence (British spelling)" do
      it "returns b" do
        expect(described_class.color_of("Sicilian Defence")).to eq("b")
      end
    end

    context "when name is not a defense" do
      it "returns w" do
        expect(described_class.color_of("Ruy Lopez")).to eq("w")
      end
    end
  end

  describe ".variation_label_of" do
    context "when name has no variation" do
      it "returns Main line" do
        expect(described_class.variation_label_of("Sicilian Defense")).to eq("Main line")
      end
    end

    context "when name has a variation" do
      it "returns the trimmed text after the colon" do
        expect(described_class.variation_label_of("Sicilian Defense: Najdorf Variation")).to eq("Najdorf Variation")
      end
    end
  end

  describe ".sub_variation_label_of" do
    context "when label has no comma" do
      it "returns Main line" do
        expect(described_class.sub_variation_label_of("Sicilian Defense: Najdorf Variation")).to eq("Main line")
      end
    end

    context "when label has a comma" do
      it "returns the trimmed text after the first comma" do
        expect(described_class.sub_variation_label_of("Sicilian Defense: Najdorf Variation, English Attack")).to eq("English Attack")
      end
    end
  end

  describe ".group_variations" do
    it "puts Main line first and buckets the rest by their first comma segment, largest first then alphabetically" do
      rows = [
        { "name" => "Sicilian Defense" },
        { "name" => "Sicilian Defense: Najdorf Variation, English Attack" },
        { "name" => "Sicilian Defense: Najdorf Variation, Scheveningen" },
        { "name" => "Sicilian Defense: Dragon Variation" }
      ]

      groups = described_class.group_variations(rows)

      expect(groups.map(&:label)).to eq([ "Main line", "Najdorf Variation", "Dragon Variation" ])
      expect(groups[1].rows.size).to eq(2)
    end
  end

  describe ".group_by_base" do
    context "when a bare root row exists" do
      it "uses that row as the representative" do
        openings = [
          { "eco" => "B20", "name" => "Sicilian Defense", "uci_moves" => "e2e4 c7c5" },
          { "eco" => "B90", "name" => "Sicilian Defense: Najdorf Variation", "uci_moves" => "e2e4 c7c5 g1f3" }
        ]

        groups = described_class.group_by_base(openings)

        expect(groups.size).to eq(1)
        expect(groups.first.representative["name"]).to eq("Sicilian Defense")
        expect(groups.first.count).to eq(2)
      end
    end

    context "when no bare root row exists" do
      it "uses the member with the fewest plies as representative" do
        openings = [
          { "eco" => "B90", "name" => "Sicilian Defense: Najdorf Variation", "uci_moves" => "e2e4 c7c5 g1f3 d7d6 d2d4" },
          { "eco" => "B91", "name" => "Sicilian Defense: Najdorf, Zagreb", "uci_moves" => "e2e4 c7c5" }
        ]

        groups = described_class.group_by_base(openings)

        expect(groups.first.representative["eco"]).to eq("B91")
      end
    end

    it "sorts groups by member count descending, then alphabetically by base name on ties" do
      openings = [
        { "eco" => "C60", "name" => "Ruy Lopez", "uci_moves" => "" },
        { "eco" => "B20", "name" => "Sicilian Defense", "uci_moves" => "" },
        { "eco" => "B90", "name" => "Sicilian Defense: Najdorf Variation", "uci_moves" => "e2e4" },
        { "eco" => "C00", "name" => "French Defense", "uci_moves" => "" }
      ]

      groups = described_class.group_by_base(openings)

      expect(groups.map(&:base)).to eq([ "Sicilian Defense", "French Defense", "Ruy Lopez" ])
    end
  end

  describe ".ply_count" do
    context "with non-empty uci_moves" do
      it "counts whitespace-separated moves" do
        expect(described_class.ply_count({ "uci_moves" => "e2e4 c7c5 g1f3" })).to eq(3)
      end
    end

    context "with blank or nil uci_moves" do
      it "returns 0" do
        expect(described_class.ply_count({ "uci_moves" => nil })).to eq(0)
        expect(described_class.ply_count({ "uci_moves" => "" })).to eq(0)
      end
    end
  end
end
