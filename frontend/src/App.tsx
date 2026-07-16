import { Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import { Dashboard } from "./Dashboard";
import { Training } from "./Training";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/training/:id" element={<Training />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
