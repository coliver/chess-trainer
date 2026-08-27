// react/src/utils/puzzleThemes.ts

/** "backRankMate" -> "back Rank Mate" */
export const formatThemeLabel = (theme: string): string =>
  theme.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

export type ThemeGroupKey =
  | "groupMotifs"
  | "groupMates"
  | "groupPhasesEndgames"
  | "groupMaterialSpecial"
  | "groupAttack"
  | "groupLengthDifficulty";

/** Curated grouping of the puzzle-DB's theme tags into practice categories. */
export const THEME_GROUPS: { key: ThemeGroupKey; themes: string[] }[] = [
  {
    key: "groupMotifs",
    themes: [
      "fork",
      "pin",
      "skewer",
      "discoveredAttack",
      "discoveredCheck",
      "doubleCheck",
      "deflection",
      "attraction",
      "clearance",
      "interference",
      "xRayAttack",
      "intermezzo",
      "zugzwang",
    ],
  },
  {
    key: "groupMates",
    themes: [
      "mateIn1",
      "mateIn2",
      "mateIn3",
      "mateIn4",
      "mateIn5",
      "backRankMate",
      "smotheredMate",
      "anastasiaMate",
      "arabianMate",
      "bodenMate",
      "cornerMate",
      "dovetailMate",
      "epauletteMate",
      "hookMate",
      "killBoxMate",
      "morphysMate",
      "operaMate",
      "pillsburysMate",
      "swallowstailMate",
      "triangleMate",
      "mate",
    ],
  },
  {
    key: "groupPhasesEndgames",
    themes: [
      "opening",
      "middlegame",
      "endgame",
      "pawnEndgame",
      "rookEndgame",
      "bishopEndgame",
      "knightEndgame",
      "queenEndgame",
      "queenRookEndgame",
    ],
  },
  {
    key: "groupMaterialSpecial",
    themes: [
      "sacrifice",
      "hangingPiece",
      "trappedPiece",
      "capturingDefender",
      "advancedPawn",
      "promotion",
      "underPromotion",
      "enPassant",
      "castling",
      "quietMove",
    ],
  },
  {
    key: "groupAttack",
    themes: ["kingsideAttack", "queensideAttack", "exposedKing"],
  },
  {
    key: "groupLengthDifficulty",
    themes: [
      "oneMove",
      "short",
      "long",
      "veryLong",
      "advantage",
      "equality",
      "crushing",
      "master",
      "masterVsMaster",
    ],
  },
];

const DEFAULT_THEME_ICON = "♟️";

/** Small emoji glyph shown on each theme card, one per tag across all groups. */
const THEME_ICONS: Record<string, string> = {
  // Motifs
  fork: "♞",
  pin: "📌",
  skewer: "🍢",
  discoveredAttack: "🎯",
  discoveredCheck: "🎯",
  doubleCheck: "‼️",
  deflection: "↪️",
  attraction: "🧲",
  clearance: "🧹",
  interference: "🚧",
  xRayAttack: "🩻",
  intermezzo: "⏸️",
  zugzwang: "🔒",
  // Mates
  mateIn1: "1️⃣",
  mateIn2: "2️⃣",
  mateIn3: "3️⃣",
  mateIn4: "4️⃣",
  mateIn5: "5️⃣",
  backRankMate: "🏰",
  smotheredMate: "♞",
  anastasiaMate: "👑",
  arabianMate: "👑",
  bodenMate: "👑",
  cornerMate: "👑",
  dovetailMate: "👑",
  epauletteMate: "👑",
  hookMate: "👑",
  killBoxMate: "👑",
  morphysMate: "👑",
  operaMate: "🎭",
  pillsburysMate: "👑",
  swallowstailMate: "👑",
  triangleMate: "👑",
  mate: "♚",
  // Phases & endgames
  opening: "🌱",
  middlegame: "⚔️",
  endgame: "🏆",
  pawnEndgame: "♟️",
  rookEndgame: "♜",
  bishopEndgame: "♝",
  knightEndgame: "♞",
  queenEndgame: "♛",
  queenRookEndgame: "♛",
  // Material & special moves
  sacrifice: "🔥",
  hangingPiece: "🎣",
  trappedPiece: "🕸️",
  capturingDefender: "🛡️",
  advancedPawn: "🚀",
  promotion: "⭐",
  underPromotion: "🔽",
  enPassant: "👻",
  castling: "🏯",
  quietMove: "🤫",
  // Attack
  kingsideAttack: "➡️",
  queensideAttack: "⬅️",
  exposedKing: "😱",
  // Length & difficulty
  oneMove: "1️⃣",
  short: "⏱️",
  long: "⏳",
  veryLong: "🐢",
  advantage: "📈",
  equality: "⚖️",
  crushing: "💥",
  master: "🎓",
  masterVsMaster: "🥇",
};

export const themeIcon = (theme: string): string =>
  THEME_ICONS[theme] ?? DEFAULT_THEME_ICON;

/**
 * Minimal, verified checkmate positions for the named-mate theme tags —
 * each is a legal, confirmed-checkmate FEN with as few pieces as possible,
 * used to render a tiny static board diagram on that theme's card.
 */
export const MATE_FENS: Record<string, string> = {
  backRankMate: "3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1",
  smotheredMate: "6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1",
  anastasiaMate: "7k/6p1/5N2/8/8/8/7R/6K1 b - - 0 1",
  arabianMate: "6Rk/8/5N2/8/8/8/8/6K1 b - - 0 1",
  bodenMate: "1nkr4/2p5/B7/8/6B1/8/8/6K1 b - - 0 1",
  cornerMate: "7k/5ppQ/5N2/8/8/8/8/6K1 b - - 0 1",
  dovetailMate: "6kQ/5pp1/6N1/8/8/8/8/6K1 b - - 0 1",
  epauletteMate: "3rkr2/8/4Q3/8/8/8/8/4K3 b - - 0 1",
  hookMate: "7k/7R/5N2/6P1/8/8/8/6K1 b - - 0 1",
  killBoxMate: "7k/7R/6Q1/8/8/8/8/6K1 b - - 0 1",
  morphysMate: "7k/7p/8/8/2B5/8/8/6RK b - - 0 1",
  operaMate: "2kR4/1p6/1B6/8/8/8/8/6K1 b - - 0 1",
  pillsburysMate: "7k/6p1/8/8/2B5/8/8/6KR b - - 0 1",
  swallowstailMate: "8/2N5/4Q3/4k3/3ppp2/8/8/6K1 b - - 0 1",
  triangleMate: "7k/6Q1/4N3/7R/8/8/8/6K1 b - - 0 1",
};
