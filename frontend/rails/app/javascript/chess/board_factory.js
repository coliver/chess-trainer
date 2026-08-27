import { Chessboard, COLOR, BORDER_TYPE } from "cm-chessboard/src/Chessboard.js"
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js"
import { Arrows, ARROW_TYPE } from "cm-chessboard/src/extensions/arrows/Arrows.js"
import "cm-chessboard/assets/chessboard.css"
import "cm-chessboard/assets/extensions/markers/markers.css"
import "cm-chessboard/assets/extensions/arrows/arrows.css"

// Sprites are copied into public/rails/cm-chessboard-assets at container boot
// (see rails/Dockerfile), served at this request path behind nginx's /rails/ mount.
const ASSETS_URL = "/rails/cm-chessboard-assets/"

// Custom marker types (styled in packages/shared-styles/board.css). Kept as
// stable object references so board.removeMarkers(type) matches by identity.
export const CUSTOM_MARKER = {
  hint: { class: "marker-square-hint", slice: "markerSquare" },
  blink: { class: "marker-square-blink", slice: "markerSquare" },
  lastmove: { class: "marker-square-lastmove", slice: "markerSquare" },
}

export { COLOR, ARROW_TYPE, MARKER_TYPE }

// Defaults match React's DEFAULT_PREFERENCES; callers that know the user's real
// board_theme/piece_set (the Settings page) can override them.
export function createPreviewBoard(el, { position, orientation, boardTheme = "default", pieceSet = "standard", showCoordinates = false }) {
  return new Chessboard(el, {
    position,
    orientation: orientation === "black" ? COLOR.black : COLOR.white,
    responsive: true,
    assetsUrl: ASSETS_URL,
    assetsCache: false,
    style: {
      cssClass: boardTheme,
      showCoordinates,
      borderType: BORDER_TYPE.none,
      pieces: { file: `pieces/${pieceSet}.svg` },
      animationDuration: 300,
    },
  })
}

// Shared construction for the interactive Training board. Move input is
// enabled by the caller (training_controller.js) via board.enableMoveInput,
// since the handler needs access to controller state.
export function createTrainingBoard(el, { position, orientation, boardTheme = "default", pieceSet = "standard", showCoordinates = true, animated = true }) {
  return new Chessboard(el, {
    position,
    orientation: orientation === "black" ? COLOR.black : COLOR.white,
    responsive: true,
    assetsUrl: ASSETS_URL,
    assetsCache: false,
    style: {
      cssClass: boardTheme,
      showCoordinates,
      borderType: BORDER_TYPE.none,
      pieces: { file: `pieces/${pieceSet}.svg` },
      animationDuration: animated ? 300 : 0,
    },
    extensions: [
      { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
      { class: Arrows, props: {} },
    ],
  })
}
