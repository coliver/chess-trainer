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

// Shared construction for the dashboard's read-only opening preview board.
// Matches React's DEFAULT_PREFERENCES (board_theme "default", piece_set
// "standard") since Settings/preferences sync is out of scope for v1.
export function createPreviewBoard(el, { position, orientation }) {
  return new Chessboard(el, {
    position,
    orientation: orientation === "black" ? COLOR.black : COLOR.white,
    responsive: true,
    assetsUrl: ASSETS_URL,
    assetsCache: false,
    style: {
      cssClass: "default",
      showCoordinates: false,
      borderType: BORDER_TYPE.none,
      pieces: { file: "pieces/standard.svg" },
      animationDuration: 300,
    },
  })
}

// Shared construction for the interactive Training board. Move input is
// enabled by the caller (training_controller.js) via board.enableMoveInput,
// since the handler needs access to controller state.
export function createTrainingBoard(el, { position, orientation }) {
  return new Chessboard(el, {
    position,
    orientation: orientation === "black" ? COLOR.black : COLOR.white,
    responsive: true,
    assetsUrl: ASSETS_URL,
    assetsCache: false,
    style: {
      cssClass: "default",
      showCoordinates: true,
      borderType: BORDER_TYPE.none,
      pieces: { file: "pieces/standard.svg" },
      animationDuration: 300,
    },
    extensions: [
      { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
      { class: Arrows, props: {} },
    ],
  })
}
