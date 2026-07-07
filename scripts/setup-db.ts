import Database from "better-sqlite3";

const db = new Database("dev.db");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS "Trainer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "bio" TEXT
);
CREATE TABLE IF NOT EXISTS "ClassTemplate" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "level" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "trainerId" INTEGER NOT NULL,
  CONSTRAINT "ClassTemplate_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "RecurringSchedule" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "frequency" TEXT NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "weekDays" TEXT,
  "monthlyMode" TEXT,
  "monthDay" INTEGER,
  "nthWeek" INTEGER,
  "nthWeekday" INTEGER,
  "startsOn" DATETIME NOT NULL,
  "endsOn" DATETIME,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "title" TEXT,
  "description" TEXT,
  "level" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "trainerId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Session" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "classTemplateId" INTEGER,
  "recurringScheduleId" INTEGER,
  "date" DATETIME NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "title" TEXT,
  "description" TEXT,
  "level" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "trainerId" INTEGER NOT NULL,
  CONSTRAINT "Session_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Session_classTemplateId_fkey" FOREIGN KEY ("classTemplateId") REFERENCES "ClassTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Session_recurringScheduleId_fkey" FOREIGN KEY ("recurringScheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Client" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'BEGINNER',
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Pass" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "remaining" INTEGER,
  "validUntil" DATETIME,
  "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priceRub" INTEGER NOT NULL,
  "paidCash" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Pass_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Booking" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "sessionId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "passId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Booking_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SessionTrainer" (
  "sessionId" INTEGER NOT NULL,
  "trainerId" INTEGER NOT NULL,
  PRIMARY KEY ("sessionId", "trainerId"),
  CONSTRAINT "SessionTrainer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionTrainer_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "RecurringScheduleTrainer" (
  "recurringScheduleId" INTEGER NOT NULL,
  "trainerId" INTEGER NOT NULL,
  PRIMARY KEY ("recurringScheduleId", "trainerId"),
  CONSTRAINT "RecurringScheduleTrainer_recurringScheduleId_fkey" FOREIGN KEY ("recurringScheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecurringScheduleTrainer_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Client_phone_key" ON "Client"("phone");
CREATE INDEX IF NOT EXISTS "Session_date_idx" ON "Session"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_recurringScheduleId_date_key" ON "Session"("recurringScheduleId", "date");
CREATE INDEX IF NOT EXISTS "Pass_clientId_idx" ON "Pass"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_clientId_sessionId_key" ON "Booking"("clientId", "sessionId");
CREATE INDEX IF NOT EXISTS "Booking_sessionId_idx" ON "Booking"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionTrainer_trainerId_idx" ON "SessionTrainer"("trainerId");
CREATE INDEX IF NOT EXISTS "RecurringScheduleTrainer_trainerId_idx" ON "RecurringScheduleTrainer"("trainerId");
`);

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.pragma(`table_info('${table}')`) as { name: string }[];
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}

ensureColumn("Trainer", "bio", "TEXT");
ensureColumn("Client", "note", "TEXT");
ensureColumn("Session", "recurringScheduleId", 'INTEGER REFERENCES "RecurringSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE');
ensureColumn("Session", "endTime", "TEXT");
ensureColumn("Session", "title", "TEXT");
ensureColumn("Session", "description", "TEXT");
ensureColumn("ClassTemplate", "endTime", "TEXT");
ensureColumn("RecurringSchedule", "endTime", "TEXT");
ensureColumn("RecurringSchedule", "monthlyMode", "TEXT");
ensureColumn("RecurringSchedule", "monthDay", "INTEGER");
ensureColumn("RecurringSchedule", "nthWeek", "INTEGER");
ensureColumn("RecurringSchedule", "nthWeekday", "INTEGER");
ensureColumn("RecurringSchedule", "title", "TEXT");
ensureColumn("RecurringSchedule", "description", "TEXT");

db.close();
