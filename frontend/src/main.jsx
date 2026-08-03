import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await registration.update();
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = Boolean(sessionStorage.getItem("plantlive-sw-reloaded"));
          if (!alreadyReloaded) sessionStorage.setItem("plantlive-sw-reloaded", "1");
        } catch { /* Storage may be blocked; reloading is still safe once per page lifecycle. */ }
        if (hadController && !alreadyReloaded) window.location.reload();
      });
    } catch (error) {
      console.warn("No se pudo actualizar el modo sin conexión", error);
    }
  });
}
