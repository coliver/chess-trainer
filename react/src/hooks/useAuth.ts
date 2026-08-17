// frontend/src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT } from "../auth";

function readAuthState() {
  return {
    isLoggedIn: !!localStorage.getItem("token"),
    username: localStorage.getItem("username"),
  };
}

export function useAuth() {
  const [state, setState] = useState(readAuthState);

  useEffect(() => {
    const sync = () => setState(readAuthState());

    // "storage" only fires for other tabs/documents; AUTH_CHANGED_EVENT
    // covers same-tab login/logout (see auth.ts).
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);

    sync();

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  return state;
}
