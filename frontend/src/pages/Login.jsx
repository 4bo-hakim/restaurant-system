import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles/Login.css";

const ICONS = ["🍕", "🍔", "🥤"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const floatingItems = useMemo(() => {
    const items = [];
    ICONS.forEach((icon) => {
      for (let i = 0; i < 20; i++) {
        items.push({
          icon,
          left: Math.random() * 100,
          top: Math.random() * 100,
          duration: 15 + Math.random() * 15,
          delay: Math.random() * -20,
          size: 24 + Math.random() * 24,
        });
      }
    });
    return items;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Your email or password is incorrect");
    }
  };

  return (
    <div className="login-page">
      <div className="floating-background">
        {floatingItems.map((item, i) => (
          <span
            key={i}
            className="floating-icon"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              fontSize: `${item.size}px`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="login-box">
        <h2 className="login-title">Staff Login</h2>

        {error && <div className="login-error">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />

        <div className="login-password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <button
            type="button"
            className="login-eye-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" className="login-button">Login</button>
      </form>
    </div>
  );
}