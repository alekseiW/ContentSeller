# GuideHub — Статус проекта

## Что сделано

### Фронтенд (React + Vite + TypeScript)
- ✅ Проект инициализирован
- ✅ TailwindCSS v3 настроен с кастомной палитрой (brand, neutral)
- ✅ 9 страниц с современным дизайном 2026
- ✅ Tiptap WYSIWYG редактор с slash-командами
- ✅ Роутинг (React Router)
- ✅ Zustand стейт-менеджмент (auth, guides)
- ✅ API клиент с интеграцией backend
- ✅ Supabase Auth интеграция
- ✅ Валидация форм, loading/error состояния

### Бэкенд (Node.js + Express + TypeScript)
- ✅ AI мульти-провайдер роутер (OpenAI → Anthropic → Gemini → Groq)
- ✅ AI endpoints: structure, generate, improve, suggest-price, cover
- ✅ Guides CRUD API с проверкой авторства
- ✅ Public guide endpoint (без auth)
- ✅ YooKassa интеграция (create, verify, webhook)
- ✅ Analytics track + aggregate API
- ✅ Supabase admin client для серверных операций
- ✅ Auth middleware (Bearer token)

### База данных (Supabase/PostgreSQL)
- ✅ Полная SQL схема: profiles, guides, guide_sections, orders, analytics_events
- ✅ Row Level Security policies для всех таблиц
- ✅ Триггеры: auto-create profile on signup, auto-update timestamps
- ✅ Helper функции: increment_view, record_sale, has_purchased
- ✅ Storage bucket для обложек и медиа

## Что нужно доделать

### Приоритет 1 (MVP)
- ⏳ Подключить реальные Supabase credentials
- ⏳ Запустить backend сервер
- ⏳ Протестировать полный flow: регистрация → создание гайда → публикация
- ⏳ Checkout страница с ЮKassa
- ⏳ Страница чтения после покупки

### Приоритет 2
- ⏳ Anti-piracy: watermarking с email покупателя
- ⏳ PDF export гайда
- ⏳ Email уведомления о покупке
- ⏳ Referral система

### Приоритет 3
- ⏳ Маркетплейс гайдов (витрина)
- ⏳ Кастомные домены
- ⏳ Drip-контент для мини-курсов
- ⏳ Мобильное приложение / PWA

## Как запустить

### Фронтенд
```bash
cd guidehub
npm install
npm run dev  # → http://localhost:5173
```

### Бэкенд
```bash
cd server
npm install
# Создать .env из .env.example
npm run dev  # → http://localhost:3001
```

### База данных
1. Создать проект на supabase.com
2. Выполнить SQL из `supabase/schema.sql` в SQL Editor
3. Обновить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в `guidehub/.env`
4. Обновить SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в `server/.env`
