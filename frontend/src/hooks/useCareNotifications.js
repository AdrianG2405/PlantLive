import { useCallback, useEffect, useState } from "react";
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
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState(supported ? window.Notification.permission : "unsupported");
  const [subscriptionStatus, setSubscriptionStatus] = useState("idle");

  const showNotification = useCallback(async (title, options) => {
    // Mobile Safari only supports displaying notifications through a service worker.
    try {
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
  }, []);

  const check = useCallback(async () => {
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
  }, [enabled, showNotification, supported, upcoming]);

  useEffect(() => {
    check().catch(() => {});
    const timer = window.setInterval(() => { check().catch(() => {}); }, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [check]);

  const syncPushSubscription = useCallback(async () => {
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
  }, [enabled, supported]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      setSubscriptionStatus("idle");
      return;
    }
    syncPushSubscription().catch(() => setSubscriptionStatus("error"));
  }, [enabled, permission, syncPushSubscription]);

  const requestPermission = async () => {
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
