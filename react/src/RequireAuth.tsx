import { useEffect, useState, type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import api from "./api";

export function RequireAuth({ children }: { children: ReactElement }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        // GET /auth/me returns { id, username } on success. Any other
        // shape (e.g. an HTML fallback page from a dev server that doesn't
        // proxy /api, returned with a 200 status) must not count as
        // authenticated just because the request didn't throw.
        const isValidUser =
          data != null &&
          typeof data === "object" &&
          "id" in data &&
          typeof data.username === "string";
        setAuthed(isValidUser);
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
