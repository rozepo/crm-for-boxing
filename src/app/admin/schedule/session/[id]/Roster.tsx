"use client";

import { useState } from "react";
import { updateAttendance } from "@/app/actions";

type Row = { id: number; name: string; initial: string; note: string; status: "BOOKED" | "PRESENT" | "NO_SHOW" | "CANCELED" };

const badge = { PRESENT: { text: "✓ Пришёл", className: "present" }, NO_SHOW: { text: "✗ Не пришёл", className: "noshow" } };

function Choice({ sessionId, bookingId, onDone }: { sessionId: number; bookingId: number; onDone: () => void }) {
  return <div className="attendActions">
    <form action={updateAttendance}><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="bookingId" value={bookingId} /><button name="status" value="PRESENT" className="primary" onClick={onDone}>Пришёл</button></form>
    <form action={updateAttendance}><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="bookingId" value={bookingId} /><button name="status" value="NO_SHOW" className="ghost" onClick={onDone}>Не пришёл</button></form>
  </div>;
}

export function Roster({ sessionId, rows, closed }: { sessionId: number; rows: Row[]; closed: boolean }) {
  const [editing, setEditing] = useState<number | null>(null);
  if (rows.length === 0) return <p className="empty">На это занятие никто не записан.</p>;
  return <div className="roster">{rows.map((row) => {
    const marked = row.status === "PRESENT" || row.status === "NO_SHOW";
    // Open card: unmarked rows can be marked directly. Closed card: only the tiny edit button reveals the choice.
    const choosing = editing === row.id || (!closed && !marked);
    const mark = badge[row.status as "PRESENT" | "NO_SHOW"];
    return <div className="clientRow" key={row.id}>
      <div className="avatar">{row.initial}</div>
      <div className="clientInfo"><strong>{row.name}</strong><span>{row.note}</span></div>
      {choosing
        ? <Choice sessionId={sessionId} bookingId={row.id} onDone={() => setEditing(null)} />
        : <div className="attendState">{mark ? <span className={mark.className}>{mark.text}</span> : <span className="muted">Записан</span>}<button className="editDot" title="Изменить" onClick={() => setEditing(row.id)}>✎</button></div>}
    </div>;
  })}</div>;
}
