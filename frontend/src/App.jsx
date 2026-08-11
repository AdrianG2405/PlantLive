import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { PlantChatbot } from "./components/PlantChatbot";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SeoManager } from "./components/SeoManager";
import { Analytics } from "./components/Analytics";
import { FeedbackButton } from "./components/FeedbackButton";
import { FirstUseGuide } from "./components/FirstUseGuide";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/authStore";
import { useCareNotifications } from "./hooks/useCareNotifications";
import { usePlants } from "./hooks/usePlants";
import { AboutPage } from "./pages/AboutPage";
import { AuthPage } from "./pages/AuthPage";
import { DiagnosisPage } from "./pages/DiagnosisPage";
import { HomePage } from "./pages/HomePage";
import { MyPlantsPage } from "./pages/MyPlantsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LegalPage } from "./pages/LegalPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { TermsPage } from "./pages/TermsPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ChatPage } from "./pages/ChatPage";
import { BlogArticlePage, BlogPage } from "./pages/BlogPage";
import { capturePhoto } from "./utils/nativeCamera";

function App() {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef();
  const notify = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4500);
  }, []);
  const garden = usePlants(user, notify);
  const notifications = useCareNotifications(garden.upcoming, Boolean(user));
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const openNativeCamera = (event) => {
      const label = event.target.closest?.("label");
      const input = label?.querySelector?.('input[type="file"][capture]');
      if (!input) return;
      event.preventDefault();
      capturePhoto(({ target }) => {
        const transfer = new DataTransfer();
        transfer.items.add(target.files[0]);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, notify);
    };
    document.addEventListener("click", openNativeCamera);
    return () => document.removeEventListener("click", openNativeCamera);
  }, [notify]);
  return <div className="app">
    <SeoManager />
    <Analytics />
    <Header />
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <main><Routes>
      <Route path="/" element={<HomePage addPlant={garden.addPlant} notify={notify} authenticated={Boolean(user)} />} />
      <Route path="/panel" element={<ProtectedRoute><DashboardPage notify={notify} /></ProtectedRoute>} />
      <Route path="/plantas" element={<MyPlantsPage {...garden} notifications={notifications} notify={notify} authenticated={Boolean(user)} />} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarPage upcoming={garden.upcoming} plants={garden.plants} completeWatering={garden.completeWatering} notify={notify} /></ProtectedRoute>} />
      <Route path="/diagnostico" element={<DiagnosisPage plants={garden.plants} addPlant={garden.addPlant} notify={notify} authenticated={Boolean(user)} />} />
      <Route path="/sobre-nosotros" element={<AboutPage />} />
      <Route path="/privacidad" element={<LegalPage />} />
      <Route path="/condiciones" element={<TermsPage />} />
      <Route path="/ajustes" element={<ProtectedRoute><SettingsPage notify={notify} /></ProtectedRoute>} />
      <Route path="/acceso" element={<AuthPage notify={notify} />} />
      <Route path="/restablecer" element={<ResetPasswordPage notify={notify} />} />
      <Route path="/verificar-email" element={<VerifyEmailPage />} />
      <Route path="/chatbot" element={<ChatPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogArticlePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
    <PlantChatbot plants={garden.plants} authenticated={Boolean(user)} notify={notify} />
    <FeedbackButton user={user} notify={notify} />
    <FirstUseGuide user={user} plantCount={garden.plants.length} loadingPlants={garden.loadingPlants} />
    <Footer />
  </div>;
}

export default function RootApp() {
  return <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>;
}
