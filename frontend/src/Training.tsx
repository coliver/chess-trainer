import { useEffect, useState } from "react";

type TrainingNextResponse = {
  session_id: number;
  item_id: number;
  order_index: number;
  fen: string;
  move_count_limit: number | null;
};

type MoveResponseResponse = {
  correct: boolean;
  reason: string;
  fen_after: string | null;
};

export default function Training() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [next, setNext] = useState<TrainingNextResponse | null>(null);
  const [moveUci, setMoveUci] = useState("");
  const [status, setStatus] = useState<string>("");

  async function startNewSession() {
    setStatus("Starting...");
    setNext(null);
    setSessionId(null);

    const res = await fetch("/api/training-sessions", { method: "POST" });
    const data = await res.json();
    setSessionId(data.id);
    setStatus("");
  }

  useEffect(() => {
    startNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const res = await fetch(`/api/training-sessions/${sessionId}/next`);
      if (!res.ok) {
        setNext(null);
        const err = await res.json().catch(() => ({}));
        setStatus(err?.detail ?? "Training completed");
        return;
      }
      const data: TrainingNextResponse = await res.json();
      setNext(data);
      setStatus("");
      setMoveUci("");
    })();
  }, [sessionId]);

  async function submit() {
    if (!sessionId || !next) return;

    setStatus("Submitting...");
    const res = await fetch(`/api/training-sessions/${sessionId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move_uci: moveUci, item_id: next.item_id }),
    });

    const data: MoveResponseResponse & { detail?: string } = await res.json();

    if (!res.ok) {
      setStatus(data?.detail ?? "Error");
      return;
    }

    setStatus(data.correct ? "Correct!" : `Wrong: ${data.reason}`);

    // Load next (or completion)
    const nextRes = await fetch(`/api/training-sessions/${sessionId}/next`);
    if (!nextRes.ok) {
      setNext(null);
      const err = await nextRes.json().catch(() => ({}));
      setStatus(err?.detail ?? "Training completed");
      return;
    }
    const nextData: TrainingNextResponse = await nextRes.json();
    setNext(nextData);
    setMoveUci("");
    setStatus("");
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>Training</h2>

      <button onClick={startNewSession} disabled={status === "Starting..."} style={{ marginBottom: 12 }}>
        Reset
      </button>

      {sessionId == null && <div>Starting session...</div>}

      {sessionId != null && !next && <div>Training completed.</div>}

      {next && (
        <>
          <div>Session: {sessionId}</div>
          <div>
            Item: {next.item_id} (order {next.order_index})
          </div>
          <div>
            FEN: <code>{next.fen}</code>
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              value={moveUci}
              onChange={(e) => setMoveUci(e.target.value)}
              placeholder="e.g. e2e4"
              style={{ width: 160 }}
            />
            <button onClick={submit} style={{ marginLeft: 8 }}>
              Submit
            </button>
          </div>

          {status && <div style={{ marginTop: 10 }}>{status}</div>}
        </>
      )}
    </div>
  );
}
