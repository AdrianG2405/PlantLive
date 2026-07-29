import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { userDataApi } from "../services/plantliveApi";

export function CalendarPage({ upcoming, plants, notify }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: "", dueDate: new Date().toISOString().slice(0, 10), plantId: "" });
  const load = useCallback(() => userDataApi.tasks().then(setTasks).catch((error) => notify(error.message)), [notify]);
  useEffect(() => { load(); }, [load]);
  const days = useMemo(() => {
    const now = new Date(), year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1).getDay(), count = new Date(year, month + 1, 0).getDate();
    return [...Array((first + 6) % 7).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, []);
  const events = [...upcoming.map((item) => ({ ...item, title: `${item.action}: ${item.plant}` })), ...tasks.map((item) => ({ ...item, date: item.dueDate }))];
  const add = async (event) => { event.preventDefault(); try { await userDataApi.addTask({ ...form, plantId: form.plantId ? Number(form.plantId) : null }); setForm({ ...form, title: "" }); load(); } catch (error) { notify(error.message); } };
  return <><section className="page-banner"><span className="kicker">PLANIFICACIÓN</span><h1>Calendario de cuidados</h1><p>Riegos, abonados y tareas personalizadas en un solo lugar.</p></section><section className="section calendar-page">
    <form className="task-form" onSubmit={add}><input required placeholder="Nueva tarea: podar, trasplantar…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /><select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}><option value="">General</option>{plants.map((p) => <option key={p.serverId} value={p.serverId}>{p.nickname}</option>)}</select><button className="primary"><Plus size={17} /> Añadir</button></form>
    <div className="month-grid"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>{days.map((day, index) => <article key={index} className={!day ? "blank-day" : ""}>{day && <><b>{day}</b>{events.filter((item) => Number(item.date?.slice(8, 10)) === day).slice(0, 3).map((item) => <small key={item.id}>{item.icon || "•"} {item.title}</small>)}</>}</article>)}</div>
    <div className="task-list">{tasks.filter((t) => !t.completed).map((task) => <div key={task.id}><span>{task.dueDate} · {task.title}</span><button onClick={async () => { await userDataApi.updateTask(task.id, { completed: true }); load(); }}><Check size={16} /> Hecho</button></div>)}</div>
  </section></>;
}
