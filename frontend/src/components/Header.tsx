// frontend/src/Header.tsx
import { Link } from "react-router-dom";
import profileIcon from "../assets/profile.svg";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <KnightSchoolIcon height="64px" />
          <Link to="/dashboard" className="site-header-title">
            Knight&nbsp;School
          </Link>
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
            </>
          )}

          <div className="site-header-actions">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
