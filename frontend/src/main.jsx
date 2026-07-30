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
    const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    await registration.update();
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !sessionStorage.getItem("plantlive-sw-reloaded")) {
        sessionStorage.setItem("plantlive-sw-reloaded", "1");
        window.location.reload();
      }
    });
  });
}
