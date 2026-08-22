require "rails_helper"

RSpec.describe ApplicationHelper, type: :helper do
  describe "#opening_preview_full_name" do
    context "when opening is a bare root" do
      it "returns just the base name" do
        expect(helper.opening_preview_full_name({ "name" => "Sicilian Defense" })).to eq("Sicilian Defense")
      end
    end

    context "when opening has a variation" do
      it "returns base and variation label" do
        expect(helper.opening_preview_full_name({ "name" => "Sicilian Defense: Najdorf Variation" }))
          .to eq("Sicilian Defense: Najdorf Variation")
      end
    end
  end

  describe "#opening_start_label" do
    context "when opening is a bare root" do
      it "returns the base name" do
        expect(helper.opening_start_label({ "name" => "Sicilian Defense" })).to eq("Sicilian Defense")
      end
    end

    context "when opening has a variation" do
      it "returns just the variation label" do
        expect(helper.opening_start_label({ "name" => "Sicilian Defense: Najdorf Variation" })).to eq("Najdorf Variation")
      end
    end
  end

  describe "#opening_row_selected?" do
    let(:opening) { { "eco" => "B20", "name" => "Sicilian Defense" } }

    context "when eco and name both match the selected opening" do
      it "returns true" do
        expect(helper.opening_row_selected?(opening, opening)).to be(true)
      end
    end

    context "when selected is nil" do
      it "returns falsey" do
        expect(helper).not_to be_opening_row_selected(nil, opening)
      end
    end

    context "when eco or name don't match" do
      it "returns false" do
        other = { "eco" => "C60", "name" => "Ruy Lopez" }
        expect(helper.opening_row_selected?(other, opening)).to be(false)
      end
    end
  end
end
