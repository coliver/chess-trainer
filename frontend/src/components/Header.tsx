// frontend/src/Header.tsx
import { Link } from "react-router-dom";
import profileIcon from "../assets/profile.svg";

export default function Header() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/dashboard" className="site-header-title">
          Chess Trainer
        </Link>

        <nav className="site-header-nav">
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
              <Link to="/profile" className="site-header-profile-link" aria-label="Profile">
                <img src={profileIcon} alt="" width={28} height={28} />
              </Link>
              <span className="site-header-pill">you are logged in maybe?</span>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
