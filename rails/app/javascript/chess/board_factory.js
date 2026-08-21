import { Chessboard, COLOR, BORDER_TYPE } from "cm-chessboard/src/Chessboard.js"
import "cm-chessboard/assets/chessboard.css"

// Sprites are copied into public/rails/cm-chessboard-assets at container boot
// (see rails/Dockerfile), served at this request path behind nginx's /rails/ mount.
const ASSETS_URL = "/rails/cm-chessboard-assets/"

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
