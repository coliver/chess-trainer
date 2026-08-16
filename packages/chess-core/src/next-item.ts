// Framework-neutral parsing of `GET /training-sessions/:id/next` responses.
// Both the React hook and the Angular service normalize the same loose
// backend shape into the same TrainingItem — this is that shared logic.
import { normalizeFen } from "./fen";

/** Loose shape of the `next` endpoint response — backend field names vary. */
export type NextItemResponse = {
  fen?: string | null;
  fenAfter?: string | null;
  epd?: string | null;
  itemId?: string | number | null;
  id?: string | number | null;
  openingName?: string | null;
  openingEco?: string | null;
  correctMoveUci?: string;
  playerColor?: "w" | "b" | null;
  [k: string]: unknown;
};

/** Normalized training item consumed by the training pages. */
export type TrainingItem = {
  fen: string;
  itemId: string | null;
  openingLabel: string;
  correctMoveUci: string;
  playerColor: "w" | "b";
};

/** Parse a raw `next` response into a normalized TrainingItem. */
export function deriveNextItem(data: NextItemResponse): TrainingItem {
  const rawFen = data.fenAfter ?? data.fen ?? data.epd;
  const itemIdRaw = data.itemId ?? data.id;

  return {
    fen: normalizeFen(rawFen),
    itemId: itemIdRaw == null || itemIdRaw === "" ? null : String(itemIdRaw),
    openingLabel: data.openingName
      ? `${data.openingEco ?? ""} ${data.openingName}`.trim()
      : "Opening: (unknown)",
    correctMoveUci: (data.correctMoveUci ?? "") as string,
    playerColor: data.playerColor === "b" ? "b" : "w",
  };
}
