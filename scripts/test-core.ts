import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { markPresent } from "../src/lib/attendance";
import { createBooking } from "../src/lib/booking";
import { createRecurringSchedule } from "../src/lib/recurrence";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 2 }) });

async function main() {
  const trainer = await prisma.trainer.findFirstOrThrow();
  const seriesStart = new Date(); seriesStart.setDate(seriesStart.getDate() + 1); seriesStart.setHours(0, 0, 0, 0);
  const seriesEnd = new Date(seriesStart); seriesEnd.setDate(seriesEnd.getDate() + 15);
  const rule = await createRecurringSchedule({
    frequency: "WEEKLY",
    interval: 1,
    weekDays: [seriesStart.getDay()],
    startsOn: seriesStart,
    endsOn: seriesEnd,
    startTime: "19:30",
    level: "BEGINNER",
    capacity: 8,
    trainerIds: [trainer.id],
  });
  const generated = await prisma.session.count({ where: { recurringScheduleId: rule.id } });
  if (generated !== 3) throw new Error(`Серия сгенерировала ${generated} занятий вместо 3`);

  const futureSession = await prisma.session.findFirstOrThrow({ where: { date: { gt: new Date() }, level: "BEGINNER" } });
  const beginner = await prisma.client.findFirstOrThrow({ where: { level: "BEGINNER", isFree: false } });
  await createBooking(beginner.id, futureSession.id);
  await createBooking(beginner.id, futureSession.id);
  const duplicateCount = await prisma.booking.count({ where: { clientId: beginner.id, sessionId: futureSession.id } });
  if (duplicateCount !== 1) throw new Error("Повторная запись создала дубль");

  const intermediate = await prisma.client.findFirstOrThrow({ where: { level: "INTERMEDIATE" } });
  let wrongLevelBlocked = false;
  try { await createBooking(intermediate.id, futureSession.id); } catch { wrongLevelBlocked = true; }
  if (!wrongLevelBlocked) throw new Error("Запись на чужой уровень не заблокирована");

  const booking = await prisma.booking.findFirstOrThrow({
    where: { client: { isFree: false }, status: "BOOKED" },
    include: { client: { include: { passes: { orderBy: { purchasedAt: "asc" } } } } },
  });
  const pass = booking.client.passes[0];
  const before = pass.remaining;
  await markPresent(booking.id);
  await markPresent(booking.id);
  const after = (await prisma.pass.findUniqueOrThrow({ where: { id: pass.id } })).remaining;
  if (before === null || after !== before - 1) throw new Error(`Ожидалось одно списание: ${before} → ${after}`);

  const freeBooking = await prisma.booking.findFirstOrThrow({ where: { client: { isFree: true }, status: "BOOKED" } });
  await markPresent(freeBooking.id);
  const result = await prisma.booking.findUniqueOrThrow({ where: { id: freeBooking.id } });
  if (result.status !== "PRESENT" || result.passId !== null) throw new Error("Бесплатник отмечен неверно");
  console.log(`OK: серия создала ${generated} занятия; запись без дублей и только на свой уровень; абонемент ${before} → ${after}; бесплатник без абонемента.`);
}

main().finally(() => prisma.$disconnect());
