import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { userDataApi } from "../services/plantliveApi";

export function CalendarPage({ upcoming, plants, notify }) {
  const [tasks, setTasks] = useState([]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [form, setForm] = useState({ title: "", dueDate: new Date().toISOString().slice(0, 10), plantId: "" });
  const load = useCallback(() => userDataApi.tasks().then(setTasks).catch((error) => notify(error.message)), [notify]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    return [...Array((first + 6) % 7).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [visibleMonth]);

  const events = [
    ...upcoming.map((item) => ({ ...item, title: `${item.action}: ${item.plant}` })),
    ...tasks.map((item) => ({ ...item, date: item.dueDate })),
  ];
  const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((item) => item.date?.startsWith(monthKey));
  const monthTasks = tasks.filter((task) => !task.completed && task.dueDate?.startsWith(monthKey));
  const monthLabel = visibleMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const changeMonth = (offset) => setVisibleMonth((current) =>
    new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const showToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };
  const add = async (event) => {
    event.preventDefault();
    try {
      await userDataApi.addTask({ ...form, plantId: form.plantId ? Number(form.plantId) : null });
      setForm({ ...form, title: "" });
      setVisibleMonth(new Date(`${form.dueDate.slice(0, 7)}-01T12:00`));
      load();
    } catch (error) { notify(error.message); }
  };

  return <><section className="page-banner"><span className="kicker">PLANIFICACIÓN</span><h1>Calendario de cuidados</h1><p>Riegos, abonados y tareas personalizadas en un solo lugar.</p></section><section className="section calendar-page">
    <form className="task-form" onSubmit={add}><input required placeholder="Nueva tarea: podar, trasplantar…" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /><select value={form.plantId} onChange={(event) => setForm({ ...form, plantId: event.target.value })}><option value="">General</option>{plants.map((plant) => <option key={plant.serverId} value={plant.serverId}>{plant.nickname}</option>)}</select><button className="primary"><Plus size={17} /> Añadir</button></form>
    <div className="calendar-month-nav"><button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={20} /></button><h2>{monthLabel}</h2><button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={20} /></button><button type="button" className="calendar-today" onClick={showToday}>Hoy</button></div>
    <div className="month-grid"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>{days.map((day, index) => <article key={`${monthKey}-${index}`} className={!day ? "blank-day" : ""}>{day && <><b>{day}</b>{monthEvents.filter((item) => Number(item.date?.slice(8, 10)) === day).slice(0, 3).map((item, eventIndex) => <small key={`${item.id || item.title}-${eventIndex}`}>{item.icon || "•"} {item.title}</small>)}</>}</article>)}</div>
    <div className="task-list">{monthTasks.map((task) => <div key={task.id}><span>{task.dueDate} · {task.title}</span><button onClick={async () => { await userDataApi.updateTask(task.id, { completed: true }); load(); }}><Check size={16} /> Hecho</button></div>)}</div>
  </section></>;
}
