# CRM секции бокса

CRM/MVP для секции бокса с админской и клиентской зонами.

Доступные интерфейсы:

- `/` — журнал тренера;
- `/admin` — клиенты и абонементы;
- `/admin/schedule` — календарь, разовые и повторяющиеся тренировки;
- `/book/login` — мобильная запись клиента по телефону.

## Запуск

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Демо-PIN: `1234`.

## Полезные команды

- `npm run db:push` — синхронизировать схему Prisma с базой.
- `npm run test:core` — проверка списания и бесплатных посещений.
- `npm run db:seed` — вернуть демонстрационные данные.
- `npm run lint` — статическая проверка.
- `npm run build` — production-сборка.

PIN задаётся переменной `STAFF_PIN` в `.env`. Для базы нужны `DATABASE_URL` и `DIRECT_URL`.

## Публичный запуск

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

4. Задеплойте приложение на Vercel и перенесите туда env-переменные.

Важно: текущий клиентский вход только по номеру телефона подходит только для закрытого пилота. Перед открытым запуском нужно добавить нормальную аутентификацию, например OTP/SMS.
