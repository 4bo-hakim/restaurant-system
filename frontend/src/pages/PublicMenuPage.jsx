import { useState, useEffect, useRef } from "react";
import "../styles/PublicMenuPage.css";

const API_BASE = "http://127.0.0.1:8000/api";

const getLocalized = (field) => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.en || Object.values(field)[0] || "";
};

const SIZE_RANK = { L: 0, M: 1, S: 2 };
const getSizeRank = (size) => {
  if (!size) return 3;
  const letter = size.trim().charAt(0).toUpperCase();
  return SIZE_RANK[letter] ?? 3;
};

const SIZE_LABELS = {
  L: { en: "Large", ar: "كبير", ku: "گەورە" },
  M: { en: "Medium", ar: "وسط", ku: "ناوەند" },
  S: { en: "Small", ar: "صغير", ku: "بچووک" },
};

const translateSize = (size, lang) => {
  if (!size) return "";
  const letter = size.trim().charAt(0).toUpperCase();
  return SIZE_LABELS[letter]?.[lang] || size;
};

const groupFoodsByName = (foods) => {
  const groups = {};
  foods.forEach((food) => {
    const key = JSON.stringify(food.name);
    if (!groups[key]) {
      groups[key] = {
        name: food.name,
        description: food.description,
        image_path: food.image_path,
        sizes: [],
      };
    }
    groups[key].sizes.push({ size: food.size, price: food.price });
  });
  return Object.values(groups).map((g) => ({
    ...g,
    sizes: g.sizes.sort((a, b) => getSizeRank(a.size) - getSizeRank(b.size)),
  }));
};

const slugify = (str) => str.replace(/\s+/g, "-");

const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

const SEARCH_PLACEHOLDER = { en: "Search menu...", ar: "ابحث في القائمة...", ku: "لە مینیو بگەڕێ..." };

const UI_TEXT = {
  brandName: { en: "Our Restaurant", ar: "مطعمنا", ku: "چێشتخانەکەمان" },
  noResults: { en: "No results found", ar: "لا توجد نتائج", ku: "هیچ ئەنجامێک نەدۆزرایەوە" },
  loading: { en: "Loading menu...", ar: "جاري تحميل القائمة...", ku: "مینیو بار دەکرێت..." },
  noMenu: { en: "No menu items available right now.", ar: "لا توجد عناصر قائمة متاحة حالياً.", ku: "لە ئێستادا هیچ خواردنێک بەردەست نییە." },
  loadError: { en: "Failed to load menu", ar: "فشل تحميل القائمة", ku: "بارکردنی مینیو سەرکەوتوو نەبوو" },
};

export default function PublicMenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSub, setActiveSub] = useState(null);
  const [lang, setLang] = useState(() => sessionStorage.getItem("menuLang") || "en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoIndex, setPromoIndex] = useState(0);
  const [highlightFoodKey, setHighlightFoodKey] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const isRTL = lang === "ar" || lang === "ku";

  const sectionRefs = useRef({});
  const navRefs = useRef({});
  const navScrollRef = useRef(null);
  const foodCardRefs = useRef({});

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/menu`, {
          headers: { Accept: "application/json", "X-Locale": lang },
        });
        if (!res.ok) throw new Error("Failed to load menu");
        const data = await res.json();
        setMenu(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [lang]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const changeLanguage = (code) => {
    setLang(code);
    sessionStorage.setItem("menuLang", code);
    setShowLangMenu(false);
    setPromoIndex(0);
  };

  const promoImages = [1, 2, 3].map((n) => `/promo-${lang}-${n}.jpg`);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoImages.length);
    }, 2100);
    return () => clearInterval(interval);
  }, [promoImages.length]);

  const allSubCategories = menu.flatMap((cat) =>
    (cat.sub_categories || []).map((sub) => ({
      id: slugify(getLocalized(sub.name)),
      name: getLocalized(sub.name),
      image_path: sub.image_path,
    }))
  );

  useEffect(() => {
    if (allSubCategories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSub(entry.target.dataset.subId);
          }
        });
      },
      { rootMargin: "-160px 0px -70% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, lang]);

  useEffect(() => {
    if (!activeSub) return;
    const navEl = navRefs.current[activeSub];
    if (navEl && navScrollRef.current) {
      navEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeSub]);

  const scrollToSub = (id) => {
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const allFoodsFlat = menu.flatMap((cat) =>
    (cat.sub_categories || []).flatMap((sub) =>
      (sub.foods || []).map((food) => ({
        ...food,
        subId: slugify(getLocalized(sub.name)),
        foodKey: `${slugify(getLocalized(sub.name))}__${JSON.stringify(food.name)}`,
      }))
    )
  );

  const query = searchQuery.trim().toLowerCase();
  const searchResults = query
    ? allFoodsFlat.filter((food) => {
        if (!food.name) return false;
        const allNames = typeof food.name === "string" ? [food.name] : Object.values(food.name);
        return allNames.some((n) => (n || "").toLowerCase().includes(query));
      })
    : [];

  const seenKeys = new Set();
  const dedupedResults = searchResults.filter((food) => {
    if (seenKeys.has(food.foodKey)) return false;
    seenKeys.add(food.foodKey);
    return true;
  });

  const goToSearchResult = (food) => {
    setSearchQuery("");
    setSearchOpen(false);
    setTimeout(() => {
      scrollToSub(food.subId);
      setTimeout(() => {
        const cardEl = foodCardRefs.current[food.foodKey];
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setHighlightFoodKey(food.foodKey);
        setTimeout(() => setHighlightFoodKey(null), 2000);
      }, 400);
    }, 50);
  };

  return (
    <div className="public-menu-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="menu-topbar">
        <div className="menu-topbar-left">
          <div className="menu-logo-circle">🍕</div>
          <span className="menu-brand-name">{UI_TEXT.brandName[lang]}</span>
        </div>
        <div className="menu-topbar-right">
          <button className="menu-topbar-icon-btn" onClick={() => setSearchOpen((s) => !s)} aria-label="Search">
            🔍
          </button>
          <div className="menu-lang-wrapper">
            <button className="menu-topbar-icon-btn" onClick={() => setShowLangMenu((s) => !s)} aria-label="Language">
              🌐
            </button>
            {showLangMenu && (
              <div className="menu-lang-dropdown">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`menu-lang-option ${lang === l.code ? "active" : ""}`}
                    onClick={() => changeLanguage(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="menu-search-bar">
          <div className="menu-search-input-row">
            <input
              type="text"
              autoFocus
              className="menu-search-input"
              placeholder={SEARCH_PLACEHOLDER[lang]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="menu-search-close-btn" onClick={closeSearch} aria-label="Close search">
              ✕
            </button>
          </div>

          {query && (
            <div className="menu-search-results">
              {dedupedResults.length === 0 ? (
                <p className="menu-search-no-results">{UI_TEXT.noResults[lang]}</p>
              ) : (
                dedupedResults.map((food) => (
                  <button
                    key={food.foodKey}
                    className="menu-search-result-row"
                    onClick={() => goToSearchResult(food)}
                  >
                    {food.image_path ? (
                      <img
                        src={`http://127.0.0.1:8000/storage/${food.image_path}`}
                        alt=""
                        className="menu-search-result-image"
                      />
                    ) : (
                      <div className="menu-search-result-image menu-search-result-image-placeholder">🍽️</div>
                    )}
                    <div className="menu-search-result-info">
                      <span className="menu-search-result-name">{getLocalized(food.name)}</span>
                      <span className="menu-search-result-price">{food.price}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="menu-promo-banner">
        <div
          className="menu-promo-track"
          style={{ transform: `translateX(${isRTL ? promoIndex * 100 : -promoIndex * 100}%)` }}
        >
          {promoImages.map((src, i) => (
            <div key={i} className="menu-promo-slide">
              <img src={src} alt={`Promo ${i + 1}`} className="menu-promo-image" />
            </div>
          ))}
        </div>
        <div className="menu-promo-dots">
          {promoImages.map((_, i) => (
            <span key={i} className={`menu-promo-dot ${promoIndex === i ? "active" : ""}`} />
          ))}
        </div>
      </div>

      {allSubCategories.length > 0 && (
        <div className="menu-nav">
          <div className="menu-nav-scroll" ref={navScrollRef}>
            {allSubCategories.map((sub) => (
              <button
                key={sub.id}
                ref={(el) => (navRefs.current[sub.id] = el)}
                className={`menu-nav-tile ${activeSub === sub.id ? "active" : ""}`}
                onClick={() => scrollToSub(sub.id)}
              >
                <div className="menu-nav-tile-image-wrap">
                  {sub.image_path ? (
                    <img
                      src={`http://127.0.0.1:8000/storage/${sub.image_path}`}
                      alt={sub.name}
                      className="menu-nav-tile-image"
                    />
                  ) : (
                    <span className="menu-nav-tile-fallback">🍽️</span>
                  )}
                </div>
                <span className="menu-nav-tile-label">{sub.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="menu-body">
        {loading && <p className="menu-status">{UI_TEXT.loading[lang]}</p>}
        {error && <p className="menu-status menu-status-error">{UI_TEXT.loadError[lang]}</p>}

        {!loading && !error && menu.length === 0 && (
          <p className="menu-status">{UI_TEXT.noMenu[lang]}</p>
        )}

        {menu.map((category) => {
          const catName = getLocalized(category.name);
          return (
            <section key={catName} className="menu-category-section">
              <h2 className="menu-category-title">{catName}</h2>

              {category.sub_categories?.map((sub, subIdx) => {
                const subId = slugify(getLocalized(sub.name));
                const groupedFoods = groupFoodsByName(sub.foods || []);

                return (
                  <div
                    key={subIdx}
                    id={subId}
                    data-sub-id={subId}
                    ref={(el) => (sectionRefs.current[subId] = el)}
                    className="menu-subcategory-block"
                  >
                    <h3 className="menu-subcategory-title">{getLocalized(sub.name)}</h3>

                    <div className="menu-food-grid">
                      {groupedFoods.map((food, foodIdx) => {
                        const foodKey = `${subId}__${JSON.stringify(food.name)}`;
                        return (
                          <div
                            key={foodIdx}
                            ref={(el) => (foodCardRefs.current[foodKey] = el)}
                            className={`menu-food-card ${highlightFoodKey === foodKey ? "menu-food-card-highlight" : ""}`}
                          >
                            {food.image_path ? (
                              <img
                                src={`http://127.0.0.1:8000/storage/${food.image_path}`}
                                alt={getLocalized(food.name)}
                                className="menu-food-image"
                              />
                            ) : (
                              <div className="menu-food-image menu-food-image-placeholder">🍽️</div>
                            )}

                            <div className="menu-food-info">
                              <h4 className="menu-food-name">{getLocalized(food.name)}</h4>
                              {food.description && getLocalized(food.description) && (
                                <p className="menu-food-desc">{getLocalized(food.description)}</p>
                              )}

                              <div className="menu-food-sizes">
                                {food.sizes.map((s, i) => (
                                  <div key={i} className="menu-food-size-row">
                                    {s.size && <span className="menu-food-size-label">{translateSize(s.size, lang)}</span>}
                                    <span className="menu-food-size-dots"></span>
                                    <span className="menu-food-size-price">{s.price}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      {showBackToTop && (
        <button className="back-to-top-btn" onClick={scrollToTop} aria-label="Back to top">
          ↑
        </button>
      )}
    </div>
  );
}