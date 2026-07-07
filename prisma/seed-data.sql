BEGIN;
TRUNCATE TABLE "Booking", "Pass", "SessionTrainer", "Session", "RecurringScheduleTrainer",
  "RecurringSchedule", "ClassTemplate", "Client", "Trainer" RESTART IDENTITY CASCADE;

INSERT INTO "Trainer" ("name", "phone", "bio") VALUES
  ('Алексей Морозов', '+7 900 111-22-33', 'Тренер по боксу и общей физической подготовке.'),
  ('Сергей Волков', '+7 900 444-55-66', 'Специализация: техника и спарринги.');

INSERT INTO "Client" ("name", "phone", "level", "isFree", "note") VALUES
  ('Иван Петров', '+79001234567', 'BEGINNER', false, 'Хочет добавить больше ОФП.'),
  ('Никита Соколов', '+79007654321', 'BEGINNER', false, 'После первой недели следим за нагрузкой.'),
  ('Дмитрий Козлов', '+79005553535', 'INTERMEDIATE', true, 'Помогает на показательных тренировках.');

INSERT INTO "Session" ("date", "startTime", "endTime", "title", "level", "capacity", "trainerId") VALUES
  (CURRENT_DATE + TIME '19:00', '19:00', '21:00', 'Вечерняя группа', 'BEGINNER', 12, 1),
  (CURRENT_DATE + INTERVAL '1 day' + TIME '20:00', '20:00', '22:00', 'Техника + спарринги', 'INTERMEDIATE', 10, 2);

INSERT INTO "SessionTrainer" ("sessionId", "trainerId") VALUES (1, 1), (1, 2), (2, 2), (2, 1);
INSERT INTO "Pass" ("clientId", "type", "remaining", "priceRub") VALUES
  (1, 'PACK', 8, 2800), (2, 'SINGLE', 1, 400);
INSERT INTO "Booking" ("clientId", "sessionId", "status", "passId") VALUES
  (1, 1, 'BOOKED', 1), (2, 1, 'BOOKED', 2), (3, 2, 'BOOKED', NULL);
COMMIT;
