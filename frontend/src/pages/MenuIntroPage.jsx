import { useNavigate } from "react-router-dom";
import "../styles/MenuIntroPage.css";

const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

export default function MenuIntroPage() {
  const navigate = useNavigate();

  const selectLanguage = (code) => {
    sessionStorage.setItem("menuLang", code);
    navigate("/menu");
  };

  return (
    <div className="menu-intro-page">
      <video
        className="menu-intro-video-bg"
        src="/intro-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <video
        className="menu-intro-video-fg"
        src="/intro-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="menu-intro-overlay" />

      <div className="menu-intro-content">
        <div className="menu-intro-buttons">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className="menu-intro-lang-btn"
              onClick={() => selectLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}