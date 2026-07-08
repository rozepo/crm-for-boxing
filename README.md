# CRM секции бокса

CRM/MVP для секции бокса с админской и клиентской зонами.

Доступные интерфейсы:

- `/` — журнал тренера;
- `/admin` — клиенты и абонементы;
- `/admin/schedule` — календарь, разовые и повторяющиеся тренировки;
- `/book/login` — мобильная запись клиента по телефону.

## Публичный сайт

Рабочая версия разворачивается на Vercel из ветки `main`. После первого деплоя здесь
нужно указать выданный Vercel адрес вида `https://crm-for-boxing.vercel.app`.

Для публикации:

1. Импортируйте GitHub-репозиторий `rozepo/crm-for-boxing` в Vercel.
2. Добавьте в настройках проекта Vercel переменные `DATABASE_URL`, `DIRECT_URL` и `STAFF_PIN`.
3. Нажмите Deploy. Последующие изменения ветки `main` будут публиковаться автоматически.

## Локальная разработка

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Для проверки на своём компьютере откройте [http://localhost:3000](http://localhost:3000).
Это локальный адрес разработчика, а не адрес публичного сайта. PIN задаётся через `STAFF_PIN`.

## Полезные команды

- `npm run db:push` — синхронизировать схему Prisma с базой.
- `npm run test:core` — проверка списания и бесплатных посещений.
- `npm run db:seed` — вернуть демонстрационные данные.
- `npm run lint` — статическая проверка.
- `npm run build` — production-сборка.

PIN задаётся переменной `STAFF_PIN` в `.env`. Для базы нужны `DATABASE_URL` и `DIRECT_URL`.

## Подключение Supabase

Проект подготовлен под Supabase Postgres + Prisma.

1. Создайте проект в Supabase и возьмите две строки подключения:
   - `DATABASE_URL` через transaction pooler (`6543`, `pgbouncer=true`);
   - `DIRECT_URL` через session pooler (`5432`) для миграций и служебных операций.
2. Добавьте `DATABASE_URL`, `DIRECT_URL` и `STAFF_PIN` в локальный `.env` и в production environment variables.
3. Выполните:

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

4. При деплое перенесите эти же env-переменные в настройки проекта Vercel.

Важно: текущий клиентский вход только по номеру телефона подходит только для закрытого пилота. Перед открытым запуском нужно добавить нормальную аутентификацию, например OTP/SMS.
