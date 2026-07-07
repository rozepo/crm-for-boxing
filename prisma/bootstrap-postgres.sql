CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'COMPLETED');
CREATE TYPE "PassType" AS ENUM ('SINGLE', 'PACK', 'UNLIMITED');
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'PRESENT', 'NO_SHOW', 'CANCELED');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "Trainer" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "bio" TEXT
);

CREATE TABLE "RecurringSchedule" (
  "id" SERIAL PRIMARY KEY,
  "frequency" "RecurrenceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "weekDays" TEXT,
  "monthlyMode" TEXT,
  "monthDay" INTEGER,
  "nthWeek" INTEGER,
  "nthWeekday" INTEGER,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3),
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "title" TEXT,
  "description" TEXT,
  "level" "Level" NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "trainerId" INTEGER NOT NULL REFERENCES "Trainer"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ClassTemplate" (
  "id" SERIAL PRIMARY KEY,
  "level" "Level" NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "trainerId" INTEGER NOT NULL REFERENCES "Trainer"("id")
);

CREATE TABLE "Session" (
  "id" SERIAL PRIMARY KEY,
  "classTemplateId" INTEGER REFERENCES "ClassTemplate"("id"),
  "recurringScheduleId" INTEGER REFERENCES "RecurringSchedule"("id"),
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "title" TEXT,
  "description" TEXT,
  "level" "Level" NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "trainerId" INTEGER NOT NULL REFERENCES "Trainer"("id")
);

CREATE TABLE "Client" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "level" "Level" NOT NULL DEFAULT 'BEGINNER',
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SessionTrainer" (
  "sessionId" INTEGER NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE,
  "trainerId" INTEGER NOT NULL REFERENCES "Trainer"("id") ON DELETE CASCADE,
  PRIMARY KEY ("sessionId", "trainerId")
);

CREATE TABLE "RecurringScheduleTrainer" (
  "recurringScheduleId" INTEGER NOT NULL REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE,
  "trainerId" INTEGER NOT NULL REFERENCES "Trainer"("id") ON DELETE CASCADE,
  PRIMARY KEY ("recurringScheduleId", "trainerId")
);

CREATE TABLE "Pass" (
  "id" SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL REFERENCES "Client"("id"),
  "type" "PassType" NOT NULL,
  "remaining" INTEGER,
  "validUntil" TIMESTAMP(3),
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priceRub" INTEGER NOT NULL,
  "paidCash" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "Booking" (
  "id" SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL REFERENCES "Client"("id"),
  "sessionId" INTEGER NOT NULL REFERENCES "Session"("id"),
  "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
  "passId" INTEGER REFERENCES "Pass"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("clientId", "sessionId")
);

CREATE INDEX "Session_date_idx" ON "Session"("date");
CREATE UNIQUE INDEX "Session_recurringScheduleId_date_key" ON "Session"("recurringScheduleId", "date");
CREATE INDEX "SessionTrainer_trainerId_idx" ON "SessionTrainer"("trainerId");
CREATE INDEX "RecurringScheduleTrainer_trainerId_idx" ON "RecurringScheduleTrainer"("trainerId");
CREATE INDEX "Pass_clientId_idx" ON "Pass"("clientId");
CREATE INDEX "Booking_sessionId_idx" ON "Booking"("sessionId");
