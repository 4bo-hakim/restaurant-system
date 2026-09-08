export const CHEF_LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

export const t = (dict, key, lang) => {
  return dict[key]?.[lang] || dict[key]?.en || key;
};

export const chefT = {
  title: { en: "Chef", ar: "الشيف", ku: "چێشتلێنەر" },
  logout: { en: "Logout", ar: "تسجيل الخروج", ku: "چوونە دەرەوە" },
  kitchenQueue: { en: "Kitchen queue", ar: "طابور المطبخ", ku: "ڕیزی چێشتخانە" },
  foodAvailability: { en: "Food availability", ar: "توفر الطعام", ku: "بەردەستبوونی خواردن" },
  noActiveOrders: { en: "No active orders right now.", ar: "لا توجد طلبات نشطة الآن.", ku: "لە ئێستادا هیچ داواکاریەکی چالاک نییە." },
  toPrepareTotal: { en: "To prepare in total:", ar: "المطلوب تحضيره إجمالاً:", ku: "بە کۆی گشتی ئامادەکردن:" },
  makeAllPreparing: { en: "Make all preparing", ar: "تحويل الكل إلى قيد التحضير", ku: "هەمووی بکە بە ئامادەکردن" },
  markAllReady: { en: "Mark all ready", ar: "وضع علامة جاهز على الكل", ku: "هەمووی بکە بە ئامادە" },
  table: { en: "Table", ar: "الطاولة", ku: "مێز" },
  waiter: { en: "Waiter", ar: "النادل", ku: "گارسۆن" },
  sentBy: { en: "Sent by", ar: "أُرسل من قبل", ku: "لەلایەن نێردراوە" },
  allCategories: { en: "All categories", ar: "كل الفئات", ku: "هەموو پۆلەکان" },
  allSubCategories: { en: "All sub-categories", ar: "كل الفئات الفرعية", ku: "هەموو ژێرپۆلەکان" },
};