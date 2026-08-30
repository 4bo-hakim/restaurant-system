import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

  if (user.role === "captain") return <Navigate to="/captain" />;
  if (user.role === "chef") return <Navigate to="/chef" />;
  if (user.role === "cashier") return <Navigate to="/cashier" />;
  if (user.role === "admin") return <Navigate to="/admin" />;

  return <p>Unknown role</p>;
}