import { useEffect, useMemo, useState } from "react";
import { userDataApi } from "../services/plantliveApi";

const datePlus = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 7));
  return date.toISOString().slice(0, 10);
};

export function usePlants(user, notify) {
  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(false);

  useEffect(() => {
    if (!user) { setPlants([]); return; }
    setLoadingPlants(true);
    userDataApi.plants().then(setPlants).catch((error) => notify(error.message)).finally(() => setLoadingPlants(false));
  }, [user, notify]);

  const addPlant = async (plant) => {
    if (!user) throw new Error("Inicia sesión para guardar plantas");
    const item = {
      ...plant,
      instanceId: globalThis.crypto?.randomUUID?.() || `plant-${Date.now()}`,
      nickname: plant.nombreComun,
      nextWater: datePlus(plant.riegoDias), nextFeed: datePlus(plant.abonoDias), notes: "",
    };
    const saved = await userDataApi.addPlant(item);
    setPlants((current) => [saved, ...current]);
    return saved;
  };
  const updatePlant = (id, values) => {
    const plant = plants.find((item) => item.instanceId === id);
    if (!plant) return;
    setPlants((current) => current.map((item) => item.instanceId === id ? { ...item, ...values } : item));
    userDataApi.updatePlant(plant.serverId, values).catch((error) => notify(error.message));
  };
  const removePlant = (id) => {
    const plant = plants.find((item) => item.instanceId === id);
    if (!plant) return;
    setPlants((current) => current.filter((item) => item.instanceId !== id));
    userDataApi.removePlant(plant.serverId).catch((error) => notify(error.message));
  };
  const upcoming = useMemo(() => plants.flatMap((plant) => [
    { id: `${plant.instanceId}-water`, date: plant.nextWater, icon: "💧", action: "Revisar riego", plant: plant.nickname || plant.nombreComun },
    { id: `${plant.instanceId}-feed`, date: plant.nextFeed, icon: "🧪", action: "Abonar", plant: plant.nickname || plant.nombreComun },
  ]).filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date)), [plants]);
  const markDone = (event) => {
    const plant = plants.find((item) => event.id.startsWith(item.instanceId));
    if (!plant) return;
    updatePlant(plant.instanceId, event.action.includes("riego")
      ? { nextWater: datePlus(plant.riegoDias) } : { nextFeed: datePlus(plant.abonoDias) });
    userDataApi.addCare(plant.serverId, {
      type: event.action.includes("riego") ? "water" : "fertilize",
    }).catch((error) => notify(error.message));
  };
  return { plants, upcoming, loadingPlants, addPlant, updatePlant, removePlant, markDone };
}
