// frontend/src/Header.tsx
import { Link } from "react-router-dom";

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
            <span className="site-header-pill"> </span>
          )}
        </nav>
      </div>
    </header>
  );
}
