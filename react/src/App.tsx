import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import { Dashboard } from "./pages/Dashboard";
import { Training } from "./pages/Training";
import { Puzzles } from "./pages/Puzzles";
import Settings from "./pages/Settings";
import Header from "./components/Header";
import { RequireAuth } from "./RequireAuth";

function App() {
  return (
    <>
      <Header />
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
    </>
  );
}

export default App;
