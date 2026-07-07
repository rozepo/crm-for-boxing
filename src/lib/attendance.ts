import { BookingStatus, PassType } from "@prisma/client";
import { prisma } from "./prisma";

// Handles every attendance transition, keeping pass balances correct:
// entering PRESENT consumes a pass, leaving PRESENT refunds the one that was spent.
export async function setAttendance(bookingId: number, status: BookingStatus) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { client: { include: { passes: { orderBy: { purchasedAt: "asc" } } } } },
    });
    if (!booking) throw new Error("Запись не найдена");
    if (booking.status === status) return booking;

    const wasPresent = booking.status === BookingStatus.PRESENT;
    const willPresent = status === BookingStatus.PRESENT;

    if (wasPresent && !willPresent) {
      if (booking.passId) {
        await tx.pass.updateMany({
          where: { id: booking.passId, type: { not: PassType.UNLIMITED } },
          data: { remaining: { increment: 1 } },
        });
      }
      return tx.booking.update({ where: { id: booking.id }, data: { status, passId: null } });
    }

    if (!wasPresent && willPresent) {
      if (booking.client.isFree) {
        return tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.PRESENT } });
      }
      const now = new Date();
      const activePass = booking.client.passes.find((pass) =>
        pass.type === PassType.UNLIMITED
          ? Boolean(pass.validUntil && pass.validUntil >= now)
          : Boolean(pass.remaining && pass.remaining > 0),
      );
      if (!activePass) throw new Error("Нет активного абонемента");
      if (activePass.type !== PassType.UNLIMITED) {
        const updated = await tx.pass.updateMany({
          where: { id: activePass.id, remaining: { gt: 0 } },
          data: { remaining: { decrement: 1 } },
        });
        if (updated.count !== 1) throw new Error("Занятия в абонементе закончились");
      }
      return tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.PRESENT, passId: activePass.id } });
    }

    return tx.booking.update({ where: { id: booking.id }, data: { status } });
  });
}

export function markPresent(bookingId: number) {
  return setAttendance(bookingId, BookingStatus.PRESENT);
}
