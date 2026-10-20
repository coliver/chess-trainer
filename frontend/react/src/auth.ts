export const AUTH_CHANGED_EVENT = "auth-changed";

// The native "storage" event only fires for OTHER tabs/documents, never for
// changes made by the current document — so same-tab login/logout needs its
// own signal for listeners like Header's isLoggedIn state to react to.
function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export type LoginData = {
  access_token: string;
  refresh_token: string;
  id: number | string;
  username: string;
  email: string;
};

export function login(data: LoginData) {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user_id", String(data.id));
  localStorage.setItem("username", data.username);
  localStorage.setItem("email", data.email);
  notifyAuthChanged();
}

export function logout() {
  // Tokens are stateless, so this is analytics only: let the backend log the
  // logout. Fire-and-forget (keepalive survives the navigation to /login), and
  // read the token before it is cleared below.
  const token = localStorage.getItem("token");
  if (token && typeof fetch === "function") {
    fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {});
  }
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  notifyAuthChanged();
}
