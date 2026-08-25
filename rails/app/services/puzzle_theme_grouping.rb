# Ruby port of react/src/utils/puzzleThemes.ts. Keep THEME_GROUPS, THEME_ICONS,
# and MATE_FENS in sync with that file if the puzzle-DB's theme tags change.
class PuzzleThemeGrouping
  Group = Struct.new(:key, :themes, keyword_init: true)

  DEFAULT_THEME_ICON = "♟️"

  THEME_GROUPS = [
    Group.new(key: "groupMotifs", themes: %w[
      fork pin skewer discoveredAttack discoveredCheck doubleCheck deflection
      attraction clearance interference xRayAttack intermezzo zugzwang
    ]),
    Group.new(key: "groupMates", themes: %w[
      mateIn1 mateIn2 mateIn3 mateIn4 mateIn5 backRankMate smotheredMate
      anastasiaMate arabianMate bodenMate cornerMate dovetailMate epauletteMate
      hookMate killBoxMate morphysMate operaMate pillsburysMate swallowstailMate
      triangleMate mate
    ]),
    Group.new(key: "groupPhasesEndgames", themes: %w[
      opening middlegame endgame pawnEndgame rookEndgame bishopEndgame
      knightEndgame queenEndgame queenRookEndgame
    ]),
    Group.new(key: "groupMaterialSpecial", themes: %w[
      sacrifice hangingPiece trappedPiece capturingDefender advancedPawn
      promotion underPromotion enPassant castling quietMove
    ]),
    Group.new(key: "groupAttack", themes: %w[kingsideAttack queensideAttack exposedKing]),
    Group.new(key: "groupLengthDifficulty", themes: %w[
      oneMove short long veryLong advantage equality crushing master masterVsMaster
    ])
  ].freeze

  THEME_ICONS = {
    "fork" => "♞", "pin" => "📌", "skewer" => "🍢", "discoveredAttack" => "🎯",
    "discoveredCheck" => "🎯", "doubleCheck" => "‼️", "deflection" => "↪️",
    "attraction" => "🧲", "clearance" => "🧹", "interference" => "🚧",
    "xRayAttack" => "🩻", "intermezzo" => "⏸️", "zugzwang" => "🔒",
    "mateIn1" => "1️⃣", "mateIn2" => "2️⃣", "mateIn3" => "3️⃣", "mateIn4" => "4️⃣",
    "mateIn5" => "5️⃣", "backRankMate" => "🏰", "smotheredMate" => "♞",
    "anastasiaMate" => "👑", "arabianMate" => "👑", "bodenMate" => "👑",
    "cornerMate" => "👑", "dovetailMate" => "👑", "epauletteMate" => "👑",
    "hookMate" => "👑", "killBoxMate" => "👑", "morphysMate" => "👑",
    "operaMate" => "🎭", "pillsburysMate" => "👑", "swallowstailMate" => "👑",
    "triangleMate" => "👑", "mate" => "♚",
    "opening" => "🌱", "middlegame" => "⚔️", "endgame" => "🏆",
    "pawnEndgame" => "♟️", "rookEndgame" => "♜", "bishopEndgame" => "♝",
    "knightEndgame" => "♞", "queenEndgame" => "♛", "queenRookEndgame" => "♛",
    "sacrifice" => "🔥", "hangingPiece" => "🎣", "trappedPiece" => "🕸️",
    "capturingDefender" => "🛡️", "advancedPawn" => "🚀", "promotion" => "⭐",
    "underPromotion" => "🔽", "enPassant" => "👻", "castling" => "🏯",
    "quietMove" => "🤫", "kingsideAttack" => "➡️", "queensideAttack" => "⬅️",
    "exposedKing" => "😱", "oneMove" => "1️⃣", "short" => "⏱️", "long" => "⏳",
    "veryLong" => "🐢", "advantage" => "📈", "equality" => "⚖️",
    "crushing" => "💥", "master" => "🎓", "masterVsMaster" => "🥇"
  }.freeze

  # Minimal, verified checkmate positions for the named-mate theme tags, used
  # to render a tiny static board diagram on that theme's card.
  MATE_FENS = {
    "backRankMate" => "3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1",
    "smotheredMate" => "6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1",
    "anastasiaMate" => "7k/6p1/5N2/8/8/8/7R/6K1 b - - 0 1",
    "arabianMate" => "6Rk/8/5N2/8/8/8/8/6K1 b - - 0 1",
    "bodenMate" => "1nkr4/2p5/B7/8/6B1/8/8/6K1 b - - 0 1",
    "cornerMate" => "7k/5ppQ/5N2/8/8/8/8/6K1 b - - 0 1",
    "dovetailMate" => "6kQ/5pp1/6N1/8/8/8/8/6K1 b - - 0 1",
    "epauletteMate" => "3rkr2/8/4Q3/8/8/8/8/4K3 b - - 0 1",
    "hookMate" => "7k/7R/5N2/6P1/8/8/8/6K1 b - - 0 1",
    "killBoxMate" => "7k/7R/6Q1/8/8/8/8/6K1 b - - 0 1",
    "morphysMate" => "7k/7p/8/8/2B5/8/8/6RK b - - 0 1",
    "operaMate" => "2kR4/1p6/1B6/8/8/8/8/6K1 b - - 0 1",
    "pillsburysMate" => "7k/6p1/8/8/2B5/8/8/6KR b - - 0 1",
    "swallowstailMate" => "8/2N5/4Q3/4k3/3ppp2/8/8/6K1 b - - 0 1",
    "triangleMate" => "7k/6Q1/4N3/7R/8/8/8/6K1 b - - 0 1"
  }.freeze

  class << self
    # "backRankMate" -> "back Rank Mate"
    def format_label(theme)
      theme.gsub(/([a-z0-9])([A-Z])/, '\1 \2')
    end

    def icon_for(theme)
      THEME_ICONS.fetch(theme, DEFAULT_THEME_ICON)
    end

    def mate_fen_for(theme)
      MATE_FENS[theme]
    end
  end
end
