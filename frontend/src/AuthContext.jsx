import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { email, role }

  const login = (email, password) => {
    // FAKE LOGIN FOR NOW — replace this with a real API call later
    let role = "captain";
    if (email.includes("chef")) role = "chef";
    else if (email.includes("cashier")) role = "cashier";
    else if (email.includes("admin")) role = "admin";

    setUser({ email, role });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}