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

  const requestPermission = async () => {
    if (!supported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      check();
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (vapidKey && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: toUint8Array(vapidKey),
        });
        await userDataApi.savePushSubscription(subscription.toJSON());
      }
    }
    return result;
  };
  return { permission, requestPermission };
}
