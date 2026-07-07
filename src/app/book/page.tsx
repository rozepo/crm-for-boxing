import { bookSession, clientLogout, unbookSession } from "@/app/actions";
import { requireClient } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { formatInterval } from "@/lib/time";

const levels = { BEGINNER: "Новички", INTERMEDIATE: "Средний", ADVANCED: "Продвинутые" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const client = await requireClient();
  const { error } = await searchParams;
  const sessions = await prisma.session.findMany({
    where: { date: { gte: new Date() }, level: client.level, status: "SCHEDULED" },
    include: {
      trainerLinks: { include: { trainer: true }, orderBy: { trainer: { name: "asc" } } },
      bookings: { where: { status: { in: ["BOOKED", "PRESENT"] } }, select: { clientId: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }], take: 20,
  });
  const pass = client.passes.find((item) => item.type === "UNLIMITED" ? Boolean(item.validUntil && item.validUntil >= new Date()) : Boolean(item.remaining && item.remaining > 0));

  return <main className="clientShell"><header className="clientHeader"><div><p className="eyebrow">ПРИВЕТ, {client.name.split(" ")[0].toUpperCase()}</p><h1>Выберите тренировку</h1></div><form action={clientLogout}><button className="roundButton" aria-label="Выйти">↗</button></form></header>
    <section className="passCard"><div><span>Ваш абонемент</span><strong>{client.isFree ? "Бесплатное посещение" : pass ? pass.type === "UNLIMITED" ? "Безлимит" : `${pass.remaining} занятий` : "Нет активного абонемента"}</strong></div><div className="passIcon">🥊</div></section>
    {error && <div className="notice errorNotice">{error}</div>}
    <div className="mobileSectionTitle"><h2>Ближайшие занятия</h2><span>{levels[client.level]}</span></div>
    <div className="bookingList">{sessions.map(session => {
      const booked = session.bookings.some(item => item.clientId === client.id);
      const free = session.capacity - session.bookings.length;
      const date = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short" }).format(session.date);
      return <article className={`bookingCard ${booked ? "selected" : ""}`} key={session.id}><div className="dateBlock"><strong>{session.startTime}</strong><span>{date}</span></div><div className="bookingMeta"><strong>{session.title || levels[session.level]}</strong><span>{formatInterval(session.startTime, session.endTime)} · {session.trainerLinks.map((link) => link.trainer.name).join(", ")}</span><small className={free <= 3 ? "hot" : ""}>{free > 0 ? `${free} мест свободно` : "Мест нет"}</small></div><form action={booked ? unbookSession : bookSession}><input type="hidden" name="sessionId" value={session.id}/><button className={booked ? "bookedButton" : "bookButton"} disabled={!booked && free === 0}>{booked ? "Записан ✓" : "Записаться"}</button></form></article>;
    })}{sessions.length === 0 && <div className="emptyMobile"><span>🥊</span><h3>Расписание готовится</h3><p>Для вашего уровня пока нет ближайших тренировок.</p></div>}</div>
    <nav className="bottomNav"><a className="active" href="/book"><span>⌁</span>Расписание</a><a href="#pass"><span>◫</span>Абонемент</a></nav>
  </main>;
}
