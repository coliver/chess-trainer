import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "./api";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await api.get("/auth/me");
        setAuthed(true);
      } catch {
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null; // or a spinner
  if (!authed) return <Navigate to="/login" replace />;

  return children;
}
