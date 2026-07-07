import { PrismaClient, BookingStatus, Level, PassType } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: path.join(process.cwd(), "dev.db") }) });

function todayAt(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.booking.deleteMany();
  await prisma.pass.deleteMany();
  await prisma.session.deleteMany();
  await prisma.recurringSchedule.deleteMany();
  await prisma.classTemplate.deleteMany();
  await prisma.client.deleteMany();
  await prisma.trainer.deleteMany();

  const alexey = await prisma.trainer.create({ data: { name: "Алексей Морозов", phone: "+7 900 111-22-33" } });
  const sergey = await prisma.trainer.create({ data: { name: "Сергей Волков", phone: "+7 900 222-33-44" } });
  const ilya = await prisma.trainer.create({ data: { name: "Илья Орлов", bio: "Техника, работа ног и индивидуальные задачи." } });
  const marat = await prisma.trainer.create({ data: { name: "Марат Алиев", bio: "Спарринги и работа по среднему уровню." } });

  const beginnerTemplate = await prisma.classTemplate.create({
    data: { level: Level.BEGINNER, dayOfWeek: new Date().getDay(), startTime: "18:00", trainerId: alexey.id, capacity: 12 },
  });
  const intermediateTemplate = await prisma.classTemplate.create({
    data: { level: Level.INTERMEDIATE, dayOfWeek: new Date().getDay(), startTime: "20:00", trainerId: sergey.id, capacity: 10 },
  });

  const beginnerSession = await prisma.session.create({
    data: {
      classTemplateId: beginnerTemplate.id,
      date: todayAt(18),
      startTime: "18:00",
      endTime: "20:00",
      title: "Новички · базовая техника",
      level: Level.BEGINNER,
      trainerId: alexey.id,
      trainerLinks: { create: [{ trainerId: alexey.id }, { trainerId: ilya.id }] },
      capacity: 12,
    },
  });
  const intermediateSession = await prisma.session.create({
    data: {
      classTemplateId: intermediateTemplate.id,
      date: todayAt(20),
      startTime: "20:00",
      endTime: "22:00",
      title: "Средний · спарринги",
      level: Level.INTERMEDIATE,
      trainerId: sergey.id,
      trainerLinks: { create: [{ trainerId: sergey.id }, { trainerId: marat.id }] },
      capacity: 10,
    },
  });

  for (let offset = 1; offset <= 12; offset += 1) {
    const level = offset % 3 === 0 ? Level.INTERMEDIATE : Level.BEGINNER;
    const template = level === Level.BEGINNER ? beginnerTemplate : intermediateTemplate;
    const trainer = level === Level.BEGINNER ? alexey : sergey;
    const hour = level === Level.BEGINNER ? 18 : 20;
    const date = new Date();
    date.setDate(date.getDate() + offset);
    date.setHours(hour, 0, 0, 0);
    const extraTrainerId = level === Level.BEGINNER ? ilya.id : marat.id;
    await prisma.session.create({
      data: {
        classTemplateId: template.id,
        date,
        startTime: `${hour}:00`,
        endTime: `${hour + 2}:00`,
        title: level === Level.BEGINNER ? "Вечерняя группа" : "Техника + спарринги",
        level,
        trainerId: trainer.id,
        trainerLinks: { create: [{ trainerId: trainer.id }, { trainerId: extraTrainerId }] },
        capacity: level === Level.BEGINNER ? 12 : 10,
      },
    });
  }

  const ivan = await prisma.client.create({ data: { name: "Иван Петров", phone: "+79001234567", level: Level.BEGINNER, note: "Хочет добавить больше ОФП." } });
  const nikita = await prisma.client.create({ data: { name: "Никита Соколов", phone: "+79007654321", level: Level.BEGINNER, note: "После первой недели, следим за нагрузкой." } });
  const dmitry = await prisma.client.create({ data: { name: "Дмитрий Козлов", phone: "+79005553535", level: Level.INTERMEDIATE, isFree: true, note: "Помогает на показательных тренировках." } });

  await prisma.pass.create({ data: { clientId: ivan.id, type: PassType.PACK, remaining: 8, priceRub: 2800 } });
  await prisma.pass.create({ data: { clientId: nikita.id, type: PassType.SINGLE, remaining: 1, priceRub: 400 } });
  await prisma.booking.createMany({ data: [
    { clientId: ivan.id, sessionId: beginnerSession.id, status: BookingStatus.BOOKED },
    { clientId: nikita.id, sessionId: beginnerSession.id, status: BookingStatus.BOOKED },
    { clientId: dmitry.id, sessionId: intermediateSession.id, status: BookingStatus.BOOKED },
  ] });
}

main().finally(() => prisma.$disconnect());
