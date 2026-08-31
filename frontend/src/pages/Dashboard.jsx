import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;

  if (user.role === "waiter") return <Navigate to="/waiter" />;
  if (user.role === "chef") return <Navigate to="/chef" />;
  if (user.role === "cashier") return <Navigate to="/cashier" />;
  if (user.role === "admin") return <Navigate to="/admin" />;

  return <p>Unknown role</p>;
}