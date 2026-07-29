# Publicar PlantLive sin AWS

La interfaz no cambia. Esta configuración usa Vercel, Render, Supabase y Resend.

## 1. Supabase

1. Crea un proyecto gratuito.
2. En Storage crea un bucket público llamado `plant-photos`.
3. Copia la URL del proyecto y la clave `service_role` (nunca la pongas en React).
4. En Database copia la cadena PostgreSQL del pooler y úsala como `DATABASE_URL`.

## 2. Render

1. Sube el repositorio a GitHub.
2. En Render elige **New > Blueprint** y selecciona el repositorio.
3. Render detectará `render.yaml`.
4. Completa las variables marcadas como secretas.
5. Usa la URL generada en `BACKEND_PUBLIC_URL`.

El servicio gratuito puede dormir por inactividad. El primer diagnóstico después
de un tiempo puede tardar mientras arranca.

## 3. Vercel

1. Importa el mismo repositorio.
2. Selecciona `frontend` como Root Directory.
3. Añade `VITE_API_URL` con la URL de Render.
4. Añade `VITE_VAPID_PUBLIC_KEY` cuando generes las claves push.
5. Copia la URL final de Vercel a `FRONTEND_URL` y `CORS_ORIGINS` en Render.

## 4. Resend

1. Crea una API key.
2. Configúrala en Render como `RESEND_API_KEY`.
3. Durante pruebas puedes usar `onboarding@resend.dev` con tu propio email.
4. Para usuarios reales verifica un dominio y cambia `EMAIL_FROM`.

## 5. Recordatorios

El workflow `.github/workflows/reminders.yml` despierta Render y solicita los
recordatorios cada día a las 08:15 UTC. Añade estos secretos en GitHub:

- `PLANTLIVE_API_URL`: URL pública de Render.
- `PLANTLIVE_CRON_SECRET`: el mismo valor `CRON_SECRET` configurado en Render.

## Seguridad

- No publiques `SUPABASE_SERVICE_ROLE_KEY`, claves de IA ni Resend.
- El frontend solo debe recibir `VITE_API_URL` y la clave VAPID pública.
- Activa HTTPS, usa una contraseña fuerte en Supabase y revisa el límite de uso.
