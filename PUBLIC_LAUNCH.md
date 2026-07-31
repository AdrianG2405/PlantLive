# Lanzamiento público de PlantLive

No publiques hasta completar todos los elementos marcados como **bloqueantes**.

## 1. Dominio y arquitectura

Configuración recomendada:

- `plantlive.es` y `www.plantlive.es` → frontend de Vercel.
- `api.plantlive.es` → backend de Render.
- `notificaciones@plantlive.es` → remitente verificado de Resend.

Después de comprar el dominio:

1. Añadir `plantlive.es` y `www.plantlive.es` en Vercel > Project > Settings > Domains.
2. Copiar exactamente los registros DNS mostrados por Vercel.
3. Añadir `api.plantlive.es` en Render > plantlive-api > Settings > Custom Domains.
4. Crear el CNAME indicado por Render y verificar TLS.
5. Cambiar en Vercel `VITE_API_URL=https://api.plantlive.es`.
6. Cambiar en Render:
   - `FRONTEND_URL=https://plantlive.es`
   - `BACKEND_PUBLIC_URL=https://api.plantlive.es`
   - `CORS_ORIGINS=https://plantlive.es,https://www.plantlive.es`
7. Redesplegar frontend y backend y probar registro, verificación y recuperación.

## 2. Identidad legal — BLOQUEANTE

Configurar en Vercel (Production y Preview si procede):

- `VITE_LEGAL_OWNER`: nombre completo o razón social del responsable.
- `VITE_CONTACT_EMAIL`: correo válido para privacidad y soporte.
- `VITE_LEGAL_ADDRESS`: domicilio legal que corresponda.

Solicitar revisión profesional de privacidad, condiciones, fiscalidad y obligaciones
del prestador antes de aceptar usuarios reales. Los textos incluidos son una base
técnica y no sustituyen asesoramiento jurídico.

## 3. Correo — BLOQUEANTE

1. Añadir el dominio o, preferiblemente, `updates.plantlive.es` en Resend.
2. Copiar los registros SPF, DKIM y MX que muestre Resend.
3. Añadir DMARC después de comprobar la entrega.
4. Configurar en Render `EMAIL_FROM=PlantLive <notificaciones@updates.plantlive.es>`.
5. Probar verificación de cuenta, recuperación y recordatorios.

## 4. Datos y copias de seguridad — BLOQUEANTE

El plan gratuito de Supabase requiere copias lógicas propias. El workflow
`.github/workflows/backup.yml` crea una copia cifrada semanal. Añadir en GitHub:

- `SUPABASE_DATABASE_URL`: URL PostgreSQL del pooler apta para `pg_dump`.
- `BACKUP_ENCRYPTION_PASSWORD`: contraseña larga y única, guardada además fuera de GitHub.

Ejecutar el workflow manualmente, descargar una copia y ensayar la restauración antes
del lanzamiento. La copia PostgreSQL no incluye los objetos de Storage; establecer
también una exportación periódica del bucket `plant-photos`.

## 5. Recordatorios — BLOQUEANTE

El workflow de recordatorios se ejecuta cada hora y el backend respeta la zona horaria
y hora elegida por cada usuario. Añadir en GitHub:

- `PLANTLIVE_API_URL=https://api.plantlive.es`
- `PLANTLIVE_CRON_SECRET`: mismo valor que `CRON_SECRET` en Render.

Probar una notificación push y otra por correo con una cuenta real.

## 6. Presupuesto y disponibilidad

- Definir alertas de gasto/cuota en Gemini y Plant.id.
- Revisar diariamente `/admin/stats` durante la beta.
- El plan gratuito de Render puede suspender el servicio por inactividad. Para un
  lanzamiento público estable, usar una instancia que no duerma.
- Mantener los límites `DAILY_DIAGNOSIS_LIMIT`, `DAILY_CHAT_LIMIT` y
  `DAILY_CARE_PROFILE_LIMIT` acordes al presupuesto.

## 7. Prueba final

Ejecutar:

```powershell
backend\venv\Scripts\python.exe -m unittest discover -s backend\tests -v
cd frontend
npm.cmd run lint
npm.cmd run build
```

Probar manualmente en iPhone/Android y escritorio:

- Crear cuenta, verificar correo, iniciar y cerrar sesión.
- Recuperar y cambiar contraseña.
- Buscar y añadir plantas.
- Hacer una foto, diagnosticar y añadir la especie identificada.
- Recalcular cuidados y revisar estaciones sin abonado.
- Activar recordatorios y completar tareas.
- Usar chatbot y comprobar el límite diario.
- Descargar datos y eliminar una cuenta de prueba.
- Revisar privacidad, condiciones, accesibilidad y enlaces 404.

## 8. Lanzamiento gradual

1. Beta cerrada con 20 usuarios durante al menos una semana.
2. Corregir incidencias y revisar respuestas botánicas señaladas.
3. Abrir registro público con monitorización diaria.
4. No anunciar precisión médica, veterinaria o fitosanitaria.
