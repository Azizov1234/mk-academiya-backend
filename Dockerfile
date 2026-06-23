# ─────────────────────────────────────────────
# Stage 1: deps — barcha dependencylarni yuklab olish
# ─────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# package.json va lock faylni nusxalash
COPY package.json package-lock.json ./

# Prisma schemani ham nusxalash (postinstall → prisma generate)
COPY prisma ./prisma/

# Barcha dependencylarni o'rnatish (dev ham, build uchun kerak)
RUN npm install


# ─────────────────────────────────────────────
# Stage 2: builder — NestJS ilovani build qilish
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# deps stagidan node_modules + prisma copy
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Barcha manba kodlarini nusxalash
COPY . .

# Prisma client generatsiya + NestJS build
RUN npm run build


# ─────────────────────────────────────────────
# Stage 3: runner — production image (yengil)
# ─────────────────────────────────────────────
FROM node:22-alpine AS runner

# Vaqt zonasini o'rnatish
ENV TZ=Asia/Tashkent

WORKDIR /app

# Xavfsizlik uchun root bo'lmagan foydalanuvchi
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Faqat production dependencylarni o'rnatish uchun
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npm cache clean --force

# Build natijasini nusxalash
COPY --from=builder /app/dist ./dist

# SQLite ma'lumotlar bazasi uchun papka yaratish
RUN mkdir -p /app/data && chown -R nestjs:nodejs /app/data

# Entrypoint scriptini nusxalash
COPY scripts ./scripts
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Fayllar egasini o'zgartirish
RUN chown -R nestjs:nodejs /app

USER nestjs

# Port ochish
EXPOSE 3232

# Salomatlik tekshiruvi
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3232/api/system/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
