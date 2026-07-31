import { useCallback, useEffect, useState } from "react";
import { userDataApi } from "../services/plantliveApi";

const toUint8Array = (value) => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

export function useCareNotifications(upcoming, enabled) {
  const supported = "Notification" in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported");
  const [subscriptionStatus, setSubscriptionStatus] = useState("idle");

  const check = useCallback(() => {
    if (!enabled || !supported || Notification.permission !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    upcoming.filter((item) => item.date <= today).forEach((item) => {
      const key = `plantlive-notified-${item.id}-${item.date}`;
      if (localStorage.getItem(key)) return;
      new Notification(`${item.icon} ${item.action}`, {
        body: `${item.plant} necesita tu atención hoy.`,
        icon: "/favicon.svg",
        tag: item.id,
      });
      localStorage.setItem(key, "1");
    });
  }, [enabled, supported, upcoming]);

  useEffect(() => {
    check();
    const timer = window.setInterval(check, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [check]);

  const syncPushSubscription = useCallback(async () => {
    if (!enabled || !supported || Notification.permission !== "granted") return false;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (!vapidKey) throw new Error("Falta configurar VITE_VAPID_PUBLIC_KEY en Vercel.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Este navegador no admite notificaciones push.");
    }
    setSubscriptionStatus("syncing");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidKey),
      });
    }
    await userDataApi.savePushSubscription(subscription.toJSON());
    setSubscriptionStatus("active");
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
    if (!supported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      check();
      await syncPushSubscription();
    }
    return result;
  };
  return { permission, requestPermission, subscriptionStatus };
}
