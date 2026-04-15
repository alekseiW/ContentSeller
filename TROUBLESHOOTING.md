# Troubleshooting Log

## 2026-04-11: "Failed to fetch" / "Not found" при логине/регистрации

### Симптомы
- Фронтенд на `localhost:5173`, бэкенд на `localhost:3001`
- При попытке залогиниться или зарегистрироваться: `Failed to fetch` или `Not found`
- Бэкенд работает (проверено через curl — `/auth/login` возвращает 200)
- PostgreSQL запущен и доступен

### Причина
1. **CORS / cross-origin**: Фронтенд на порту 5173 делает fetch на `http://localhost:3001` — браузер блокирует cross-origin запросы
2. **Отсутствие proxy в Vite**: Vite dev server не проксировал API-запросы на бэкенд
3. **Несовпадение путей**: После добавления прокси `/api/*` → `localhost:3001`, пути не совпадали — фронтенд слал `/auth/login`, а прокси слушал `/api/*`
4. **Пустой API_URL**: `api.ts` имел `API_URL = ''` (same origin), но запросы шли без `/api` префикса, поэтому прокси их не ловил

### Решение (3 шага)

**Шаг 1: Добавить proxy в vite.config.ts**
```ts
// guidehub/vite.config.ts
server: {
  // ...existing config
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),  // strip /api prefix
    },
  },
}
```

**Шаг 2: Установить API_URL = '/api' в api.ts**
```ts
// guidehub/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || '/api'
```
Теперь запросы идут на `/api/auth/login` → Vite proxy strip'ит `/api` → бэкенд получает `/auth/login`.

**Шаг 3: Очистить .env фронтенда**
Убрать старые `VITE_SUPABASE_*` переменные. Оставить только:
```
VITE_API_URL=
```

### Как проверить
```powershell
# Бэкенд отвечает напрямую:
Invoke-WebRequest -Uri http://localhost:3001/auth/login -Method POST -ContentType "application/json" -Body '{"email":"test@test.com","password":"testpass123"}'

# Прокси работает:
Invoke-WebRequest -Uri http://localhost:5173/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"test@test.com","password":"testpass123"}'
```
Оба должны вернуть 200 с токеном.

### Если проблема повторится
1. Проверить что оба сервера запущены: `netstat -ano | findstr "3001 5173"`
2. Проверить `API_URL` в `api.ts` — должен быть `/api`
3. Проверить proxy в `vite.config.ts` — должен быть `/api` с `rewrite`
4. Перезапустить Vite dev server (HMR может не подхватить изменения конфига)
