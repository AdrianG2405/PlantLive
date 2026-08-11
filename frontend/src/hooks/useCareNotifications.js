import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { userDataApi } from "../services/plantliveApi";
import { trackEvent } from "../utils/analytics";

const toUint8Array = (value) => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const isAppleMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

const isStandalone = () => typeof window !== "undefined"
  && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);

export function useCareNotifications(upcoming, enabled) {
  const native = Capacitor.isNativePlatform();
  const supported = native || (typeof window !== "undefined" && "Notification" in window);
  const [permission, setPermission] = useState(native ? "prompt" : supported ? window.Notification.permission : "unsupported");
  const [subscriptionStatus, setSubscriptionStatus] = useState("idle");

  useEffect(() => {
    if (!native) return;
    LocalNotifications.checkPermissions().then(({ display }) => {
      setPermission(display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt");
    }).catch(() => setPermission("prompt"));
  }, [native]);

  const showNotification = useCallback(async (title, options) => {
    try {
      if (native) {
        await LocalNotifications.schedule({ notifications: [{
          id: Math.floor(Date.now() % 2147483647), title, body: options?.body || "",
          schedule: { at: new Date(Date.now() + 1000) }, extra: { source: "plantlive-care" },
        }] });
        return true;
      }
      // Mobile Safari only supports displaying notifications through a service worker.
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.showNotification) {
          await registration.showNotification(title, options);
          return true;
        }
      }
      new window.Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }, [native]);

  const scheduleNativeCare = useCallback(async () => {
    if (!native || !enabled || permission !== "granted") return false;
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((item) => item.extra?.source === "plantlive-care");
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
    const now = new Date();
    const notifications = upcoming.slice(0, 50).map((item, index) => {
      const at = new Date(`${item.date}T09:00:00`);
      if (at <= now) at.setTime(now.getTime() + 5000 + index * 1000);
      return {
        id: 10000 + index,
        title: `${item.icon || "🌿"} ${item.action}`,
        body: `${item.plant} necesita tu atención.`,
        schedule: { at },
        extra: { source: "plantlive-care", careId: item.id },
      };
    });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    setSubscriptionStatus("active");
    return true;
  }, [enabled, native, permission, upcoming]);

  const check = useCallback(async () => {
    if (native) return;
    if (!enabled || !supported || window.Notification.permission !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    for (const item of upcoming.filter((candidate) => candidate.date <= today)) {
      const key = `plantlive-notified-${item.id}-${item.date}`;
      try {
        if (localStorage.getItem(key)) continue;
      } catch { /* Storage may be restricted on mobile. */ }
      const delivered = await showNotification(`${item.icon} ${item.action}`, {
        body: `${item.plant} necesita tu atención hoy.`,
        icon: "/favicon.svg",
        tag: item.id,
      });
      if (delivered) {
        try { localStorage.setItem(key, "1"); } catch { /* Notification was still delivered. */ }
      }
    }
  }, [enabled, native, showNotification, supported, upcoming]);

  useEffect(() => {
    check().catch(() => {});
    const timer = window.setInterval(() => { check().catch(() => {}); }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [check]);

  const syncPushSubscription = useCallback(async () => {
    if (native) return scheduleNativeCare();
    if (!enabled || !supported || window.Notification.permission !== "granted") return false;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (!vapidKey) throw new Error("Falta configurar VITE_VAPID_PUBLIC_KEY en Vercel.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Este navegador no admite notificaciones push.");
    }
    setSubscriptionStatus("syncing");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    let created = false;
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidKey),
      });
      created = true;
    }
    await userDataApi.savePushSubscription(subscription.toJSON());
    setSubscriptionStatus("active");
    if (created) trackEvent("notifications_activated");
    return true;
  }, [enabled, native, scheduleNativeCare, supported]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      setSubscriptionStatus("idle");
      return;
    }
    syncPushSubscription().catch(() => setSubscriptionStatus("error"));
  }, [enabled, permission, syncPushSubscription]);

  const requestPermission = async () => {
    if (native) {
      setSubscriptionStatus("syncing");
      let status = await LocalNotifications.checkPermissions();
      if (status.display !== "granted") status = await LocalNotifications.requestPermissions();
      const result = status.display === "granted" ? "granted" : "denied";
      setPermission(result);
      if (result !== "granted") {
        setSubscriptionStatus("error");
        throw new Error("Android no concedió el permiso. Actívalo en Ajustes → Aplicaciones → PlantLive → Notificaciones.");
      }
      trackEvent("notifications_activated", { platform: "android" });
      setSubscriptionStatus("active");
      return result;
    }
    if (isAppleMobile() && !isStandalone()) {
      throw new Error("En iPhone o iPad, abre esta web en Safari, pulsa Compartir → Añadir a pantalla de inicio y activa los avisos desde la app instalada.");
    }
    if (!supported || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Este navegador no admite notificaciones push. En dispositivos Apple necesitas iOS/iPadOS 16.4 o posterior y abrir PlantLive desde la pantalla de inicio.");
    }
    if (window.Notification.permission === "denied") {
      throw new Error("Las notificaciones están bloqueadas. Actívalas para PlantLive en los ajustes de notificaciones del dispositivo o del navegador.");
    }
    const result = await window.Notification.requestPermission();
    setPermission(result);
    if (result === "denied") {
      throw new Error("Safari no concedió el permiso. Revisa los ajustes de notificaciones de PlantLive y vuelve a intentarlo.");
    }
    if (result === "granted") {
      await check();
      await syncPushSubscription();
    }
    return result;
  };
  return { permission, requestPermission, subscriptionStatus };
}
