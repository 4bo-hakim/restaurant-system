import { createContext, useContext, useState } from "react";

const AuthContext = createContext();
const API_BASE = "http://127.0.0.1:8000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setError(null);
    try {
      // 1. Real login call
      const loginRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) throw new Error("Invalid email or password");

      const loginData = await loginRes.json();
      const token = loginData.data.access_token;

      // 2. Get real user info using the token
      const userRes = await fetch(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await userRes.json();

      // 3. TEMPORARY: fake role from email until backend adds real role field
      let role = "captain";
      if (email.includes("chef")) role = "chef";
      else if (email.includes("cashier")) role = "cashier";
      else if (email.includes("admin")) role = "admin";

      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        token,
        role, // TODO: replace with userData.role once backend adds it
      });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}