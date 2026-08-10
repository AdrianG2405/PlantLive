export function trackEvent(name, parameters = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, parameters);
}
