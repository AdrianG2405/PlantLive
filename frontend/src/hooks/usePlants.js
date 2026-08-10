import { useEffect, useMemo, useState } from "react";
import { createCareProfile, findPlantPhoto, seasonalCareDays, userDataApi } from "../services/plantliveApi";

const datePlus = (days) => {
  const interval = Number(days);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date.toISOString().slice(0, 10);
};

const datePlusFrom = (value, days) => {
  const interval = Number(days);
  if (!value || !Number.isFinite(interval) || interval <= 0) return null;
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + interval);
  return date.toISOString().slice(0, 10);
};

const adjustedWaterDays = (plant, date = new Date(), weatherAdjustment = 0) => Math.max(1,
  seasonalCareDays(plant, "riego", date) + Number(plant.wateringAdjustmentDays || 0) + weatherAdjustment);

export function usePlants(user, notify) {
  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [weatherAdjustment, setWeatherAdjustment] = useState(0);
  const [weatherSummary, setWeatherSummary] = useState(null);

  useEffect(() => {
    if (!user) { setWeatherAdjustment(0); setWeatherSummary(null); return; }
    userDataApi.settings().then(async (settings) => {
      if (!settings.weatherEnabled || !settings.weatherLatitude || !settings.weatherLongitude) return;
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${settings.weatherLatitude}&longitude=${settings.weatherLongitude}&current=temperature_2m,precipitation&timezone=auto`);
      const current = (await response.json()).current;
      const adjustment = current.temperature_2m >= 30 ? -2 : current.temperature_2m <= 12 ? 2 : current.precipitation >= 5 ? 1 : 0;
      setWeatherAdjustment(adjustment);
      setWeatherSummary({ temperature: current.temperature_2m, precipitation: current.precipitation, adjustment });
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) { setPlants([]); return; }
    setLoadingPlants(true);
    userDataApi.plants().then((items) => {
      setPlants(items);
      items.filter((plant) => !plant.imagen && plant.nombreCientifico).forEach(async (plant) => {
        const imagen = await findPlantPhoto(plant.nombreCientifico).catch(() => null);
        if (!imagen) return;
        const saved = await userDataApi.updatePlant(plant.serverId, { imagen }).catch(() => null);
        if (saved) setPlants((current) => current.map((item) => item.serverId === plant.serverId ? saved : item));
      });
    }).catch((error) => notify(error.message)).finally(() => setLoadingPlants(false));
  }, [user, notify]);

  const addPlant = async (plant) => {
    if (!user) throw new Error("Inicia sesión para guardar plantas");
    const imagen = plant.imagen || await findPlantPhoto(plant.nombreCientifico).catch(() => null);
    const item = {
      ...plant,
      collectionStatus: plant.collectionStatus || "active",
      imagen,
      instanceId: globalThis.crypto?.randomUUID?.() || `plant-${Date.now()}`,
      nickname: plant.nombreComun,
      nextWater: plant.collectionStatus && plant.collectionStatus !== "active" ? null : datePlus(adjustedWaterDays(plant, new Date(), weatherAdjustment)),
      nextFeed: plant.collectionStatus && plant.collectionStatus !== "active" ? null : datePlus(seasonalCareDays(plant, "abono")),
      notes: "",
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
  const refreshPlantCare = async (id, conditions = {}) => {
    const plant = plants.find((item) => item.instanceId === id);
    if (!plant) throw new Error("Planta no encontrada");
    const refreshed = await createCareProfile(plant, {
      ubicacionEnCasa: conditions.homeLocation ?? plant.homeLocation,
      tamanoMaceta: conditions.potSize ?? plant.potSize,
      sustratoActual: conditions.currentSubstrate ?? plant.currentSubstrate,
      exposicion: conditions.exposure ?? plant.exposure,
      ultimoTrasplante: conditions.lastRepot ?? plant.lastRepot,
    });
    const values = {
      ...refreshed,
      ...conditions,
      instanceId: plant.instanceId,
      nickname: plant.nickname,
      nextWater: datePlus(adjustedWaterDays({ ...refreshed, wateringAdjustmentDays: plant.wateringAdjustmentDays }, new Date(), weatherAdjustment)),
      nextFeed: datePlus(seasonalCareDays(refreshed, "abono")),
    };
    const saved = await userDataApi.updatePlant(plant.serverId, values);
    setPlants((current) => current.map((item) => item.instanceId === id ? saved : item));
    return saved;
  };
  const upcoming = useMemo(() => plants.filter((plant) => !plant.collectionStatus || plant.collectionStatus === "active").flatMap((plant) => [
    { id: `${plant.instanceId}-water`, date: plant.nextWater, icon: "💧", action: "Revisar riego", plant: plant.nickname || plant.nombreComun },
    ...(seasonalCareDays(plant, "abono") > 0 ? [
      { id: `${plant.instanceId}-feed`, date: plant.nextFeed, icon: "🧪", action: "Abonar / fertilizar", plant: plant.nickname || plant.nombreComun },
    ] : []),
  ]).filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date)), [plants]);
  const markDone = (event) => {
    const plant = plants.find((item) => event.id.startsWith(item.instanceId));
    if (!plant) return;
    updatePlant(plant.instanceId, event.action.includes("riego")
      ? { nextWater: datePlus(seasonalCareDays(plant, "riego")) }
      : { nextFeed: datePlus(seasonalCareDays(plant, "abono")) });
    userDataApi.addCare(plant.serverId, {
      type: event.action.includes("riego") ? "water" : "fertilize",
    }).catch((error) => notify(error.message));
  };
  const completeWatering = async (event, moistureFeedback = "right") => {
    const plant = plants.find((item) => item.instanceId === event.plantInstanceId);
    if (!plant || !event.date) return;
    const completedWaterings = [...new Set([...(plant.completedWaterings || []), event.date])].sort();
    const previousAdjustment = Number(plant.wateringAdjustmentDays || 0);
    const adjustmentChange = moistureFeedback === "wet" ? 1 : moistureFeedback === "dry" ? -1 : 0;
    const wateringAdjustmentDays = Math.max(-4, Math.min(5, previousAdjustment + adjustmentChange));
    const values = {
      completedWaterings,
      wateringAdjustmentDays,
      wateringFeedback: [...(plant.wateringFeedback || []), { date: event.date, moisture: moistureFeedback, adjustmentDays: wateringAdjustmentDays }].slice(-20),
      nextWater: datePlusFrom(event.date, adjustedWaterDays({ ...plant, wateringAdjustmentDays }, new Date(`${event.date}T12:00:00`), weatherAdjustment)),
    };
    setPlants((current) => current.map((item) => item.instanceId === plant.instanceId ? { ...item, ...values } : item));
    try {
      await Promise.all([
        userDataApi.updatePlant(plant.serverId, values),
        userDataApi.addCare(plant.serverId, { type: "water", notes: `Riego ${event.date}; sustrato ${moistureFeedback}` }),
      ]);
    } catch (error) {
      notify(error.message);
      throw error;
    }
  };
  return { plants, upcoming, loadingPlants, weatherSummary, addPlant, updatePlant, refreshPlantCare, removePlant, markDone, completeWatering };
}
