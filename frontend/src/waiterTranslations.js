export const WAITER_LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

export const t = (dict, key, lang) => {
  return dict[key]?.[lang] || dict[key]?.en || key;
};

export const waiterT = {
  title: { en: "Waiter", ar: "النادل", ku: "گارسۆن" },
  logout: { en: "Logout", ar: "تسجيل الخروج", ku: "چوونە دەرەوە" },
  categories: { en: "Categories", ar: "الفئات", ku: "پۆلەکان" },
  subcategories: { en: "Sub-categories", ar: "الفئات الفرعية", ku: "ژێرپۆلەکان" },
  food: { en: "Food", ar: "الطعام", ku: "خواردن" },
  order: { en: "Order", ar: "الطلب", ku: "داواکاری" },
  noItemsYet: { en: "No items yet", ar: "لا توجد عناصر بعد", ku: "هێشتا هیچ شتێک نییە" },
  total: { en: "Total", ar: "الإجمالي", ku: "کۆی گشتی" },
  sendOrder: { en: "Send order to kitchen", ar: "إرسال الطلب إلى المطبخ", ku: "ناردنی داواکاری بۆ چێشتخانە" },
  notePlaceholder: { en: "Note (optional)", ar: "ملاحظة (اختياري)", ku: "تێبینی (ئارەزوومەندانە)" },
  add: { en: "Add", ar: "إضافة", ku: "زیادکردن" },
  unavailable: { en: "Unavailable", ar: "غير متوفر", ku: "نەبەردەست" },
  orderUpdated: { en: "Order updated!", ar: "تم تحديث الطلب!", ku: "داواکاری نوێکرایەوە!" },
  invoiceBanner: { en: "Invoice", ar: "الفاتورة", ku: "پسوولە" },
  statusPending: { en: "status: pending", ar: "الحالة: قيد الانتظار", ku: "دۆخ: چاوەڕوان" },
  totalLabel: { en: "total", ar: "الإجمالي", ku: "کۆی گشتی" },
  keepAdding: { en: "You can keep adding items for this table and send again.", ar: "يمكنك الاستمرار في إضافة عناصر لهذه الطاولة والإرسال مرة أخرى.", ku: "دەتوانیت بەردەوام بیت لە زیادکردنی شت بۆ ئەم مێزە و دووبارە بینێریت." },
};