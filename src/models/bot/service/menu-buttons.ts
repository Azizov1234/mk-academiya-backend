export const ADMIN_MENU = {
  STATS: '📊 Statistika',
  CEFR_RESULTS: '📘 CEFR natijalari',
  IELTS_RESULTS: '🎯 IELTS natijalari',
  STUDENT_SEARCH: '🔎 Student qidirish',
  ADD_RESULT: '➕ Natija joylash',
  ADD_ADMIN: "👤➕ Admin qo'shish",
  REMOVE_ADMIN: "👤➖ Admin o'chirish",
  ADMIN_LIST: "👥 Adminlar ro'yxati",
  EDIT_ABOUT: "📝 Haqimizda matni",
  EDIT_ADDRESS: '📍 Manzilni yangilash',
  EDIT_CONTACT: "📞 Bog'lanishni yangilash",
  ADD_COURSE: "📚 Kurs qo'shish",
  LEADS: '📨 Murojaatlar',
  USER_MENU: '🏠 User menyuga qaytish',
} as const;

export const USER_MENU = {
  ABOUT: "🏫 O'quv markaz haqida",
  COURSES: '📚 Kurslar',
  RESULTS: '🏆 Natijalar',
  ADDRESS: '📍 Manzil',
  CONTACT: '📞 Bog\'lanish',
  LEAD_REQUEST: '📝 Murojaat qoldirish',
} as const;

export const RESULTS_SUBMENU = {
  CEFR_RESULTS: '📘 CEFR natijalari',
  IELTS_RESULTS: '🎯 IELTS natijalari',
  BACK: '⬅️ Ortga',
} as const;

export const FLOW_MENU = {
  CANCEL: '❌ Bekor qilish',
  SKIP: "⏭️ O'tkazib yuborish",
  EXAM_CEFR: '📘 CEFR',
  EXAM_IELTS: '🎯 IELTS',
} as const;

export const KNOWN_BUTTONS = new Set<string>([
  ...Object.values(ADMIN_MENU),
  ...Object.values(USER_MENU),
  ...Object.values(RESULTS_SUBMENU),
  ...Object.values(FLOW_MENU),
]);
