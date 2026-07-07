import Link from "next/link";
import { notFound } from "next/navigation";
import { logout, setSessionStatus, updateSession } from "@/app/actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";
import { Roster } from "./Roster";

const levels = { BEGINNER: "Новички", INTERMEDIATE: "Средний", ADVANCED: "Продвинутые" };

export default async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: {
      trainer: true,
      trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } },
      recurringSchedule: true,
      bookings: { include: { client: { include: { passes: { orderBy: { purchasedAt: "desc" } } } } }, orderBy: { createdAt: "asc" } },
    },
  });
  const trainers = await prisma.trainer.findMany({ orderBy: { name: "asc" } });
  if (!session) notFound();

  const closed = session.status !== "SCHEDULED";
  const present = session.bookings.filter((b) => b.status === "PRESENT").length;
  const noShow = session.bookings.filter((b) => b.status === "NO_SHOW").length;
  const rows = session.bookings.map((booking) => {
    const pass = booking.client.passes[0];
    return {
      id: booking.id,
      name: booking.client.name,
      initial: booking.client.name.slice(0, 1),
      note: booking.client.isFree ? "Бесплатное место" : pass ? `Остаток: ${pass.remaining ?? "∞"}` : "Нет абонемента",
      status: booking.status as "BOOKED" | "PRESENT" | "NO_SHOW" | "CANCELED",
    };
  });
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(session.date);
  const sessionDate = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, "0")}-${String(session.date.getDate()).padStart(2, "0")}`;

  return <main>
    <header className="topbar"><div><span className="eyebrow">СЕКЦИЯ БОКСА</span><h1>Карточка тренировки</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Клиенты</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>

    <Link href="/admin/schedule" className="backLink">← К расписанию</Link>

    <section className="card sessionDetail">
      <div className="detailHead">
        <div><p className="eyebrow" style={{ textTransform: "capitalize" }}>{dateLabel}</p><h2>{session.title || levels[session.level]} · {formatInterval(session.startTime, session.endTime)}</h2><p className="muted">{session.trainerLinks.map((link) => link.trainer.name).join(", ")} · #{session.id}</p></div>
        <span className={closed ? "statusTag closed" : "statusTag open"}>{closed ? "Закрыта" : "Открыта"}</span>
      </div>
      <div className="detailStats">
        <div><strong>{session.bookings.length}/{session.capacity}</strong><span>записано</span></div>
        <div><strong className="okText">{present}</strong><span>пришли</span></div>
        <div><strong className="muted">{noShow}</strong><span>не пришли</span></div>
      </div>
      <form action={updateSession} className="stack">
        <input type="hidden" name="sessionId" value={session.id} />
        <div className="formPair"><label>Дата<input type="date" name="date" defaultValue={sessionDate} required /></label><label>Название<input name="title" defaultValue={session.title ?? ""} placeholder="Например, ОФП + техника" /></label></div>
        <div className="formPair"><label>Начало<input type="time" name="startTime" defaultValue={session.startTime} required /></label><label>Конец<input type="time" name="endTime" defaultValue={session.endTime ?? ""} /></label></div>
        <div className="formPair"><label>Мест<input type="number" name="capacity" defaultValue={session.capacity} min="1" max="50" required /></label><label>Уровень<select name="level" defaultValue={session.level}><option value="BEGINNER">Новички</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутые</option></select></label></div>
        <fieldset><legend>Тренеры</legend><div className="trainerChecks">{trainers.map((trainer) => <label key={trainer.id} className="trainerChip"><input type="checkbox" name="trainerIds" value={trainer.id} defaultChecked={session.trainerLinks.some((link) => link.trainerId === trainer.id)} /><span>{trainer.name}</span></label>)}</div></fieldset>
        <label>Описание<textarea name="description" rows={3} placeholder="Заметка к тренировке: акцент, спарринги, оборудование…" defaultValue={session.description ?? ""} /></label>
        <button className="ghost">Сохранить слот</button>
      </form>
      {session.recurringScheduleId ? <Link className="ghostLink" href={`/admin/schedule/series/${session.recurringScheduleId}`}>Открыть всю серию</Link> : null}
      <form action={setSessionStatus}><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="status" value={closed ? "SCHEDULED" : "COMPLETED"} /><button className={closed ? "ghost" : "primary"}>{closed ? "Открыть заново" : "Закрыть тренировку"}</button></form>
    </section>

    <section className="card">
      <div className="sessionHead"><div><span className="pill">Состав</span></div><p>{closed ? "Тренировка закрыта — правки только через ✎" : "Отметьте, кто пришёл"}</p></div>
      <Roster sessionId={session.id} rows={rows} closed={closed} />
    </section>
  </main>;
}
