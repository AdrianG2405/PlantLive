import { useState } from "react";
import { MailWarning } from "lucide-react";
import { authApi } from "../services/plantliveApi";

export function EmailVerificationBanner({ user, notify }) {
  const [sending, setSending] = useState(false);
  if (!user || user.emailVerified !== false) return null;
  const resend = async () => {
    setSending(true);
    try { const data = await authApi.resendVerification(); notify(data.message); }
    catch (error) { notify(error.message); }
    finally { setSending(false); }
  };
  return <aside className="verification-banner"><MailWarning size={18} /><span>Verifica tu correo para utilizar el diagnóstico y el asistente.</span><button onClick={resend} disabled={sending}>{sending ? "Enviando…" : "Reenviar correo"}</button></aside>;
}
