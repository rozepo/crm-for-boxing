import Link from "next/link";
import { createClient, createTrainer, logout, sellPass } from "../actions";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const levels = { BEGINNER: "Новичок", INTERMEDIATE: "Средний", ADVANCED: "Продвинутый" };

export default async function AdminPage() {
  await requireStaff();
  const [clients, trainers] = await Promise.all([
    prisma.client.findMany({ include: { passes: { orderBy: { purchasedAt: "desc" } }, bookings: true }, orderBy: { createdAt: "desc" } }),
    prisma.trainer.findMany({
      include: {
        sessionLinks: { include: { session: true } },
        recurringLinks: { include: { recurringSchedule: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return <main><header className="topbar"><div><span className="eyebrow">СЕКЦИЯ БОКСА</span><h1>Клиенты и команда</h1></div><nav><Link href="/admin/schedule">Расписание</Link><Link href="/admin">Люди</Link><form action={logout}><button className="linkButton">Выйти</button></form></nav></header>
    <div className="adminGrid">
      <section className="card formCard"><h2>Новый клиент</h2><p>Добавьте человека после первой оплаты или знакомства.</p><form action={createClient} className="stack"><label>Имя<input name="name" required placeholder="Александр Иванов" /></label><label>Телефон<input name="phone" required placeholder="+7 900 000-00-00" /></label><label>Уровень<select name="level"><option value="BEGINNER">Новичок</option><option value="INTERMEDIATE">Средний</option><option value="ADVANCED">Продвинутый</option></select></label><label>Заметка<textarea name="note" rows={3} placeholder="Травмы, цели, нюансы общения" /></label><label className="check"><input type="checkbox" name="isFree"/> Бесплатное место</label><button className="primary">Добавить клиента</button></form></section>
      <section className="card formCard"><h2>Новый тренер</h2><p>Карточка тренера нужна для расписания и аналитики.</p><form action={createTrainer} className="stack"><label>Имя<input name="name" required placeholder="Илья Орлов" /></label><label>Телефон<input name="phone" placeholder="+7 900 000-00-00" /></label><label>Описание<textarea name="bio" rows={3} placeholder="Специализация, стиль, ограничения по дням" /></label><button className="primary">Добавить тренера</button></form></section>
      <section className="card formCard"><h2>Продать абонемент</h2><p>Оплата фиксируется как наличная.</p><form action={sellPass} className="stack"><label>Клиент<select name="clientId">{clients.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Тип<select name="type"><option value="PACK">Пакет</option><option value="SINGLE">Разовое</option><option value="UNLIMITED">Безлимит, 30 дней</option></select></label><label>Количество занятий<input type="number" name="remaining" defaultValue="8" min="1" /></label><label>Цена, ₽<input type="number" name="priceRub" defaultValue="2800" min="0" /></label><button className="primary">Зачислить абонемент</button></form></section>
    </div>

    <section className="peopleGrid">
      <section className="card clients">
        <div className="sectionTitle"><div><p className="eyebrow">КЛИЕНТЫ</p><h2>Все клиенты</h2></div><strong>{clients.length}</strong></div>
        <div className="table">{clients.map(client => {
          const pass = client.passes[0];
          return <Link className="tableRow tableLink" href={`/admin/clients/${client.id}`} key={client.id}>
            <div className="avatar">{client.name[0]}</div>
            <div><strong>{client.name}</strong><span>{client.phone}</span></div>
            <span className="muted">{levels[client.level]}</span>
            <span className={client.isFree ? "free badge" : "paid badge"}>{client.isFree ? "Бесплатно" : "Платный"}</span>
            <div className="balance"><strong>{client.isFree ? "—" : pass?.remaining ?? 0}</strong><span>{client.bookings.length} записей</span></div>
          </Link>;
        })}</div>
      </section>

      <section className="card clients">
        <div className="sectionTitle"><div><p className="eyebrow">ТРЕНЕРЫ</p><h2>Команда</h2></div><strong>{trainers.length}</strong></div>
        <div className="table">{trainers.map((trainer) => {
          const upcoming = trainer.sessionLinks.filter((link) => link.session.date >= new Date()).length;
          const series = trainer.recurringLinks.length;
          return <Link className="tableRow tableLink" href={`/admin/trainers/${trainer.id}`} key={trainer.id}>
            <div className="avatar">{trainer.name[0]}</div>
            <div><strong>{trainer.name}</strong><span>{trainer.phone || "без телефона"}</span></div>
            <span className="muted">{series} серий</span>
            <span className="paid badge">{upcoming} слотов</span>
            <div className="balance"><strong>{upcoming}</strong><span>будущих</span></div>
          </Link>;
        })}</div>
      </section>
    </section>
  </main>;
}
