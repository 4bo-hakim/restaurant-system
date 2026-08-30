import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ allowedRole, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" />;
  if (user.role !== allowedRole && user.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return children;
}