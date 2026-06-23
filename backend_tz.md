CEFR Learning Platform — Backend TZ (Texnik Topshiriq)
1. Loyiha Haqida Umumiy Ma'lumot
Maqsad: CEFR standartiga asoslangan online ta'lim platformasi — o'quvchilar lug'at yod oladi, testlar topshiradi, vazifalarni kuzatadi. O'qituvchi va admin panel orqali boshqariladi.
Foydalanuvchi rollari: Student | Teacher | Admin

2. Tech Stack (Tavsiya)
QatlamTexnologiyaSababRuntimeNode.js (Express) yoki Python (FastAPI)Tez prototiplash, katta communityDatabasePostgreSQLRelational data, JSONB supportCacheRedisSession, leaderboard, vocab repeat algorithmAuthJWT + Refresh TokenStateless, mobil ham ishlaydiFile StorageAWS S3 / Cloudflare R2Audio (listening), rasm fayllarQueueBullMQ (Redis-based)Email, notifikatsiya, reminderSearchPostgreSQL FTS yoki MeiliSearchLug'at qidirishReal-timeSocket.ioLive test, classroom mode

3. Ma'lumotlar Bazasi Sxemasi
👤 Users & Auth
sqlusers
  id, password_hash, role (student|teacher|admin),
  full_name, avatar_url, cefr_level (A1|A2|B1|B2|C1|C2),
  is_active, created_at, updated_at

refresh_tokens
  id, user_id, token_hash, expires_at, device_info

user_profiles
  user_id, phone, date_of_birth, language (uz|ru|en),
  timezone, notification_settings (JSONB)

🏫 Kurs Tuzilmasi
sqlcourses
  id, title, description, cefr_level, cover_image_url,
  created_by (teacher_id), is_published(true)

groups
  id, course_id, title, description,
  created_by (teacher_id), is_published(true)

units
  id, group_id, title, description,
  unlock_condition (JSONB)  -- masalan: prev_unit_score >= 70

lessons
  id, unit_id, title, type (vocab|grammar|reading|listening|speaking),
  content (JSONB), duration_minutes

enrollments
  id, student_id, course_id, enrolled_at, completed_at,
  progress_percent, last_accessed_at
  
📚 Vocabulary System (Core Feature)
sqlvocabularies
  id, unit_id, word, translation, pronunciation,
  part_of_speech, example_sentence, example_translation,
  image_url, audio_url, difficulty (1-5), cefr_level

vocabulary_progress  -- Spaced Repetition uchun
  id, student_id, vocabulary_id,
  status (new|learning|reviewing|mastered),
  ease_factor, interval_days, next_review_at,
  correct_count, wrong_count, last_reviewed_at

word_lists  -- Custom listlar
  id, student_id, name, is_public
  
word_list_items
  id, word_list_id, vocabulary_id, added_at

💡 Idea: SM-2 Spaced Repetition Algorithm ishlatiladi — so'z qanchalik ko'p xato qilinsa, shunchalik tez-tez takrorlanadi. Duolingo va Anki shu algoritmni ishlatadi.

✅ Tasks System
sqltasks
  id, unit_id, lesson_id (nullable), title, description,
  type (reading|writing|speaking|project|quiz),
  instructions (JSONB), max_score, due_date_offset_days,
  is_required, order_index

student_tasks
  id, student_id, task_id, status (pending|in_progress|submitted|graded|overdue),
  submitted_at, submission_content (JSONB),
  score, teacher_feedback, graded_at, graded_by

task_attachments
  id, task_id, file_url, file_type, uploaded_by
🧪 Test System
sqltests
  id, unit_id, title, type (unit_test|mock_exam|placement|practice),
  cefr_level, time_limit_minutes, passing_score,
  shuffle_questions, max_attempts, is_adaptive

questions
  id, test_id, type (mcq|true_false|fill_blank|matching|ordering|essay),
  question_text, options (JSONB), correct_answer (JSONB),
  explanation, points, difficulty, skill (reading|listening|grammar|vocab)

test_attempts
  id, student_id, test_id, started_at, submitted_at,
  score, percentage, passed, time_spent_seconds,
  answers (JSONB), feedback (JSONB)

question_analytics  -- Qaysi savol qiyin ekanini bilish uchun
  id, question_id, total_attempts, correct_count, avg_time_seconds
🏆 Gamification
sqlachievements
  id, title, description, icon_url, condition_type,
  condition_value, xp_reward, badge_color

student_achievements
  id, student_id, achievement_id, earned_at

xp_transactions
  id, student_id, amount, reason, reference_id, created_at

leaderboards  -- Redis-da ham cache qilinadi
  id, scope (global|course|unit|weekly),
  student_id, score, rank, period
💬 Communication
sqlnotifications
  id, user_id, type, title, body, data (JSONB),
  is_read, created_at

messages  -- Teacher-Student
  id, sender_id, receiver_id, content, is_read,
  thread_id, created_at

class_rooms
  id, teacher_id, course_id, name, invite_code,
  schedule (JSONB), max_students

classroom_members
  id, classroom_id, student_id, joined_at, status

4. API Endpointlar (REST)
🔐 Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
📖 Courses & Units
GET    /api/courses                    -- barcha kurslar
POST   /api/courses                    -- teacher: yangi kurs
GET    /api/courses/:id
PUT    /api/courses/:id
GET    /api/courses/:id/units
POST   /api/courses/:id/enroll         -- student: yozilish
GET    /api/courses/:id/progress       -- student: progress
GET    /api/units/:id/lessons
GET    /api/units/:id/vocabularies
GET    /api/units/:id/tasks
GET    /api/units/:id/tests
📚 Vocabulary
GET    /api/vocab/review               -- bugungi takror so'zlar (SRS)
POST   /api/vocab/:id/result           -- to'g'ri/xato javob qayd etish
GET    /api/vocab/stats                -- statistika
POST   /api/vocab/word-lists           -- yangi list yaratish
GET    /api/vocab/word-lists/:id/study -- o'qish sessiyasi
GET    /api/vocab/search?q=word        -- qidirish
🧪 Tests
POST   /api/tests/:id/start            -- attempt boshlash
POST   /api/tests/:id/submit           -- javoblarni yuborish
GET    /api/tests/:id/result/:attemptId
GET    /api/tests/history              -- o'tgan testlar
POST   /api/tests/placement            -- CEFR placement test
✅ Tasks
GET    /api/tasks/my                   -- student tasklari
POST   /api/tasks/:id/submit           -- topshirish
GET    /api/teacher/tasks              -- teacher: barcha submissions
PUT    /api/teacher/tasks/:submissionId/grade  -- baholash
👨‍💼 Admin Panel
GET    /api/admin/dashboard/stats
GET    /api/admin/users
PUT    /api/admin/users/:id/role
GET    /api/admin/courses/analytics
POST   /api/admin/bulk-import/vocab    -- Excel orqali so'zlar import
GET    /api/admin/reports/progress

5. Muhim Business Logic
🔄 Spaced Repetition (SM-2)
Har so'z uchun: ease_factor (default 2.5), interval (kunlar)
  - To'g'ri javob → interval * ease_factor → keyingi review shu kundan keyin
  - Xato javob → interval = 1 (ertaga qayta ko'rsatiladi)
  - Har kuni /vocab/review endpoint max 20-30 so'z qaytaradi
🔓 Unit Unlock Tizimi
Unit ochilish shartlari (unlock_condition JSONB):
  - Oldingi unit testidan min_score (masalan 70%) olish
  - Oldingi unitdagi barcha required tasklarni topshirish
  - Ma'lum miqdor vocab mastered qilish
📊 Progress Hisoblash
Unit progress =
  (completed_lessons / total_lessons) * 40% +
  (mastered_vocab / total_vocab) * 30% +
  (submitted_tasks / required_tasks) * 30%
🎯 Adaptive Testing (Kelajak uchun)
Placement test:
  1. B1 dan boshlaydi
  2. To'g'ri → qiyinroq savol
  3. Xato → osonroq savol
  4. 20 savoldan so'ng CEFR level aniqlanadi

6. Security
✅ Rate Limiting (express-rate-limit / FastAPI slowapi)
✅ Input Validation (Zod / Pydantic)
✅ SQL Injection → ORM ishlatish (Prisma / SQLAlchemy)
✅ XSS → sanitize-html
✅ CORS → whitelist domenlar
✅ Helmet.js (HTTP security headers)
✅ Test attempt fraud detection:
    - IP tracking
    - Tab switching detection (frontend + backend log)
    - Time anomaly (juda tez topshirish)
✅ File upload → tip va hajm cheklash (max 10MB, faqat pdf/image/audio)

7. Qo'shimcha Ideyalar 💡
IdeyaTavsifStreak tizimiHar kun kirsa "streak" oshadi, 7 kun = badge. Motivatsiya uchun kuchliVocabulary Battle2 student real-time so'z tanishadi, kim tezroq javob bersa yutadiAI FeedbackWriting task topshirilganda Claude API orqali grammatika xatolarini avtomatik ko'rsatadiSpeaking PracticeWeb Speech API orqali talaffuzni baholashParent DashboardBolalar uchun ota-ona kuzatib borishi mumkinOffline ModeService Worker orqali lug'atlar offline ham ishlashiExcel ImportTeacher yoki admin vocab, questions ni Excel orqali ommaviy yuklashiTelegram BotKunlik vocab reminder, streak ko'rsatishCertificateCEFR mock exam o'tganda PDF sertifikat generatsiya

8. Deployment Arxitekturasi
[Client] → [Nginx/Cloudflare] → [API Server (Node/Python)]
                                        ↓
                              [PostgreSQL] + [Redis]
                                        ↓
                              [S3/R2 - Media Files]
                                        ↓
                              [BullMQ - Background Jobs]
                                        ↓
                              [SMTP/FCM - Notifications]
Boshlash uchun tavsiya: Railway.app yoki Render.com — bepul tier bilan prototip chiqarish, keyin VPS ga ko'chirish.