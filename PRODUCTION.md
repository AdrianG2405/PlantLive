# PlantLive: puesta en producción

La aplicación funciona localmente con SQLite y notificaciones del navegador.
Para producción:

1. Configurar `DATABASE_URL` con PostgreSQL y administrar cambios con Alembic.
2. Servir frontend y backend exclusivamente mediante HTTPS.
3. Mover las sesiones a cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
4. Configurar SMTP/SES/Resend para recordatorios por correo.
5. Configurar claves VAPID y guardar suscripciones Web Push en el backend.
6. Guardar fotografías en S3, no como base64 ni dentro de SQLite.
7. Añadir verificación de email, recuperación de contraseña y rate limiting.
8. Configurar backups, monitorización, alertas y presupuestos de las APIs de IA.
9. Completar textos legales con los datos reales del responsable y un proceso RGPD.
10. Ejecutar pruebas end-to-end antes de publicar.

El service worker actual aporta instalación y caché básica. El evento `push` está
preparado, pero necesita un servicio backend con VAPID para recibir avisos cuando
la aplicación está cerrada.

## Componentes ya preparados

- Suscripciones Web Push guardadas por usuario mediante `/user/push-subscriptions`.
- Worker de recordatorios en `backend/notification_worker.py`.
- Envío opcional por SMTP y Web Push con claves VAPID.
- Solicitud y confirmación de recuperación de contraseña.
- Límites diarios de diagnóstico y estadísticas administrativas.
- Orígenes CORS configurables mediante `CORS_ORIGINS`.

Instala las dependencias actualizadas:

```powershell
cd backend
.\venv\Scripts\pip.exe install -r requirements.txt
```

Para probar una ronda de notificaciones:

```powershell
.\venv\Scripts\python.exe notification_worker.py
```

En producción debe programarse ese comando diariamente con EventBridge, cron o el
planificador del proveedor. La recuperación por correo requiere que el endpoint
`/auth/forgot-password` entregue el enlace usando el proveedor SMTP configurado.
