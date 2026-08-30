import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CaptainPage from "./pages/CaptainPage";
import ChefPage from "./pages/ChefPage";
import CashierPage from "./pages/CashierPage";
import AdminPage from "./pages/AdminPage";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/captain"
            element={<ProtectedRoute allowedRole="captain"><CaptainPage /></ProtectedRoute>}
          />
          <Route
            path="/chef"
            element={<ProtectedRoute allowedRole="chef"><ChefPage /></ProtectedRoute>}
          />
          <Route
            path="/cashier"
            element={<ProtectedRoute allowedRole="cashier"><CashierPage /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRole="admin"><AdminPage /></ProtectedRoute>}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;