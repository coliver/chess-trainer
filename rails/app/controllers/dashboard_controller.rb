class DashboardController < ApplicationController
  before_action :require_auth!

  SEARCH_PAGE = 60

  def show
    @summary = api.get("/progress/summary")
    @due_count = api.get("/progress/due").size
    @weak_spots = api.get("/progress/weak-spots").first(5)

    @openings = api.get("/openings")
    @groups = OpeningGrouping.group_by_base(@openings)

    prefs = current_preferences
    @board_theme = prefs["board_theme"]
    @piece_set = prefs["piece_set"]

    @query = params[:q].to_s.strip
    @base = params[:base].presence
    @color_filter = %w[w b].include?(params[:color]) ? params[:color] : "all"
    @sort_az = params[:sort] == "az"
    @search_limit = (params[:limit] || SEARCH_PAGE).to_i

    @selected = find_selected(params[:eco], params[:name])
    @player_color = @selected ? OpeningGrouping.color_of(OpeningGrouping.base_name_of(@selected["name"])) : "w"

    if @query.present?
      @view = :search
      q = @query.downcase
      @search_matches = @openings.select { |o| o["name"].downcase.include?(q) || o["eco"].downcase.include?(q) }
    elsif @base
      @view = :variations
      @active_group = @groups.find { |g| g.base == @base }
    else
      @view = :bases
      sorted = @sort_az ? @groups.sort_by(&:base) : @groups
      @visible_groups = @color_filter == "all" ? sorted : sorted.select { |g| OpeningGrouping.color_of(g.base) == @color_filter }
    end
  end

  private

  def find_selected(eco, name)
    return nil unless eco.present? && name.present?
    @openings.find { |o| o["eco"] == eco && o["name"] == name }
  end
end
