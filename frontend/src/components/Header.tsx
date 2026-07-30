// frontend/src/components/Header.tsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import profileIcon from "../assets/profile.svg";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";

export default function Header() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );

  useEffect(() => {
    const syncFromStorage = () =>
      setIsLoggedIn(!!localStorage.getItem("token"));

    window.addEventListener("storage", syncFromStorage);

    // also sync immediately (covers same-tab login without relying on "storage" event)
    syncFromStorage();

    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const username = localStorage.getItem("username");
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? "Good morning ☀️"
        : hour < 18
          ? "Good afternoon 🌤️"
          : "Good evening 🌙";
    const who = username ? `, ${username}` : "";
    return `${base}${who}`;
  }, [username]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <KnightSchoolIcon height="64px" />
          <Link to="/dashboard" className="site-header-title">
            Knight&nbsp;School
          </Link>
        </div>

        <div className="site-header-right">
          <div role="heading" className="site-header-greeting">
            {greeting}
          </div>

          <nav className="site-header-nav" aria-label="Primary">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="site-header-link">
                  Login
                </Link>
                <Link to="/register" className="site-header-link">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  className="site-header-profile-link"
                  aria-label="Profile"
                >
                  <img src={profileIcon} alt="" width={28} height={28} />
                </Link>
                <button className="site-header-profile-link" onClick={onLogout}>Logout</button>
              </>
            )}

            <div className="site-header-actions">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
