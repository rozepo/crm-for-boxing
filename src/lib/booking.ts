import { BookingStatus } from "@prisma/client";
import { prisma } from "./prisma";

export async function createBooking(clientId: number, sessionId: number) {
  return prisma.$transaction(async (tx) => {
    const [client, session] = await Promise.all([
      tx.client.findUnique({ where: { id: clientId } }),
      tx.session.findUnique({ where: { id: sessionId } }),
    ]);
    if (!client || !session) throw new Error("Клиент или тренировка не найдены");
    if (session.status !== "SCHEDULED" || session.date < new Date()) throw new Error("Эта тренировка уже недоступна");
    if (client.level !== session.level) throw new Error("Тренировка не соответствует вашему уровню");

    const existing = await tx.booking.findUnique({ where: { clientId_sessionId: { clientId, sessionId } } });
    if (existing?.status === BookingStatus.BOOKED || existing?.status === BookingStatus.PRESENT) return existing;

    const occupied = await tx.booking.count({
      where: { sessionId, status: { in: [BookingStatus.BOOKED, BookingStatus.PRESENT] } },
    });
    if (occupied >= session.capacity) throw new Error("На тренировке уже нет свободных мест");

    return tx.booking.upsert({
      where: { clientId_sessionId: { clientId, sessionId } },
      update: { status: BookingStatus.BOOKED },
      create: { clientId, sessionId, status: BookingStatus.BOOKED },
    });
  });
}

export async function cancelBooking(clientId: number, sessionId: number) {
  const booking = await prisma.booking.findUnique({ where: { clientId_sessionId: { clientId, sessionId } } });
  if (!booking || booking.status !== BookingStatus.BOOKED) throw new Error("Активная запись не найдена");
  return prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELED } });
}
