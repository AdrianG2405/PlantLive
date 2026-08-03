import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { seasonalCareDays, userDataApi } from "../services/plantliveApi";

const isoDate = (date) => date.toISOString().slice(0, 10);
const dateFromIso = (value) => new Date(`${value}T12:00:00`);
const addDays = (value, days) => {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + Math.max(1, Number(days) || 1));
  return isoDate(date);
};

export function CalendarPage({ upcoming, plants, notify }) {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
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

  const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const projectedWaterings = useMemo(() => {
    const monthStart = `${monthKey}-01`;
    const monthEnd = isoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 12));
    return plants.flatMap((plant) => {
      if (!plant.nextWater) return [];
      const items = [];
      let date = plant.nextWater;
      let guard = 0;
      while (date < monthStart && guard < 400) {
        date = addDays(date, seasonalCareDays(plant, "riego", dateFromIso(date)));
        guard += 1;
      }
      while (date <= monthEnd && guard < 400) {
        items.push({
          id: `${plant.instanceId}-water-${date}`,
          date,
          icon: "💧",
          action: "Riego previsto",
          plant: plant.nickname || plant.nombreComun,
          title: `Riego: ${plant.nickname || plant.nombreComun}`,
        });
        date = addDays(date, seasonalCareDays(plant, "riego", dateFromIso(date)));
        guard += 1;
      }
      return items;
    });
  }, [monthKey, plants, visibleMonth]);
  const events = [
    ...upcoming.filter((item) => !item.action.toLowerCase().includes("riego")).map((item) => ({ ...item, title: `${item.action}: ${item.plant}` })),
    ...projectedWaterings,
    ...tasks.filter((item) => !item.completed).map((item) => ({ ...item, date: item.dueDate })),
  ];
  const monthEvents = events.filter((item) => item.date?.startsWith(monthKey));
  const monthTasks = tasks.filter((task) => !task.completed && task.dueDate?.startsWith(monthKey));
  const monthLabel = visibleMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const selectedEvents = selectedDate ? events.filter((item) => item.date === selectedDate) : [];

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

  return <><section className="page-banner"><span className="kicker">PLANIFICACIÓN</span><h1>Calendario de cuidados</h1><p>Consulta todos los riegos previstos, abonados y tareas. La planificación calcula cada riego suponiendo que se realiza en la fecha indicada.</p></section><section className="section calendar-page">
    <form className="task-form" onSubmit={add}><input required placeholder="Nueva tarea: podar, trasplantar…" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /><select value={form.plantId} onChange={(event) => setForm({ ...form, plantId: event.target.value })}><option value="">General</option>{plants.map((plant) => <option key={plant.serverId} value={plant.serverId}>{plant.nickname}</option>)}</select><button className="primary"><Plus size={17} /> Añadir</button></form>
    <div className="calendar-month-nav"><button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={20} /></button><h2>{monthLabel}</h2><button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={20} /></button><button type="button" className="calendar-today" onClick={showToday}>Hoy</button></div>
    <div className="month-grid"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>{days.map((day, index) => {
      const date = day ? `${monthKey}-${String(day).padStart(2, "0")}` : null;
      const dayEvents = date ? monthEvents.filter((item) => item.date === date) : [];
      return <article key={`${monthKey}-${index}`} className={`${!day ? "blank-day" : ""} ${selectedDate === date ? "selected-day" : ""} ${dayEvents.length ? "has-events" : ""}`}>{day && <button type="button" className="calendar-day-button" onClick={() => setSelectedDate(date)} aria-label={`Ver planificación del ${day} de ${monthLabel}`}><b>{day}</b>{dayEvents.slice(0, 3).map((item, eventIndex) => <small key={`${item.id || item.title}-${eventIndex}`}>{item.icon || "•"} {item.title}</small>)}</button>}</article>;
    })}</div>
    <div className="task-list">{monthTasks.map((task) => <div key={task.id}><span>{task.dueDate} · {task.title}</span><button onClick={async () => { await userDataApi.updateTask(task.id, { completed: true }); load(); }}><Check size={16} /> Hecho</button></div>)}</div>
    {selectedDate && <div className="calendar-detail-backdrop" onClick={() => setSelectedDate(null)}><section className="calendar-day-detail" onClick={(event) => event.stopPropagation()}><button className="calendar-detail-close" onClick={() => setSelectedDate(null)} aria-label="Cerrar"><X size={20} /></button><span className="kicker">PLANIFICACIÓN DEL DÍA</span><h2>{new Date(`${selectedDate}T12:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>{selectedEvents.length ? <div className="calendar-detail-events">{selectedEvents.map((item, index) => <article key={`${item.id || item.title}-${index}`}><span>{item.icon || "•"}</span><div><b>{item.title}</b><small>{item.plant || "Tarea programada"}</small></div></article>)}</div> : <p>No hay cuidados programados para este día.</p>}</section></div>}
  </section></>;
}
