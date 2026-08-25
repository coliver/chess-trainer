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
  mateIn1: "🏁",
  mateIn2: "🏁",
  mateIn3: "🏁",
  mateIn4: "🏁",
  mateIn5: "🏁",
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
