import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import { Dashboard } from "./pages/Dashboard";
import { Training } from "./pages/Training";
import { Puzzles } from "./pages/Puzzles";
import Settings from "./pages/Settings";
import { HomeHeader } from "./components/HomeHeader";
import { GameHeader } from "./components/GameHeader";
import { GameHeaderProvider } from "./context/GameHeaderContext";
import { RequireAuth } from "./RequireAuth";
import { useSnowPreference } from "./hooks/useSnowPreference";
import { snow } from "./utils/snow";

const SNOW_CYCLE_MS = 15 * 1000;

function AppHeader() {
  const location = useLocation();

  // Game routes: use minimal GameHeader
  const isGameRoute =
    location.pathname.startsWith("/training/") ||
    location.pathname.startsWith("/puzzle/");

  if (isGameRoute) {
    return <GameHeader />;
  }

  // Default: use full HomeHeader
  return <HomeHeader />;
}

function App() {
  const { snowEnabled } = useSnowPreference();

  useEffect(() => {
    if (!snowEnabled) return;

    let stopCurrent = snow();
    const interval = setInterval(() => {
      stopCurrent = snow();
    }, SNOW_CYCLE_MS);

    return () => {
      clearInterval(interval);
      stopCurrent?.();
    };
  }, [snowEnabled]);

  return (
    <GameHeaderProvider>
      <AppHeader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/training/:id"
          element={
            <RequireAuth>
              <Training />
            </RequireAuth>
          }
        />
        <Route
          path="/puzzles"
          element={
            <RequireAuth>
              <Puzzles />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </GameHeaderProvider>
  );
}

export default App;
