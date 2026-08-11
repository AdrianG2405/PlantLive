# Borrador del formulario Seguridad de los datos

Este documento es una guía conservadora para completar Play Console. Debe coincidir con la configuración real de producción y con los contratos de cada proveedor.

## Respuestas generales

- ¿La aplicación recoge o comparte datos? Sí.
- ¿Los datos se cifran durante la transmisión? Sí, mediante HTTPS.
- ¿El usuario puede solicitar la eliminación? Sí.
- URL de eliminación: https://www.plantlive.es/eliminar-cuenta
- ¿La aplicación está dirigida a menores? No.
- ¿Contiene anuncios? No.
- ¿Incluye compras o suscripciones? No actualmente.

## Datos recogidos

| Categoría de Play Console | Datos de PlantLive | Obligatorio | Finalidad |
| --- | --- | --- | --- |
| Información personal | Nombre y correo electrónico | Para crear cuenta | Gestión de cuenta, autenticación, soporte y verificación |
| Fotos y vídeos | Fotografías de plantas y sustratos | No | Funcionalidad, seguimiento y análisis solicitado |
| Ubicación | Coordenadas aproximadas | No | Adaptar recomendaciones al clima local cuando el usuario lo activa |
| Actividad en la aplicación | Interacciones, diagnósticos, plantas, tareas y preferencias | En parte | Funcionalidad, personalización y mejora del servicio |
| Contenido generado por usuarios | Preguntas al chatbot, observaciones y comentarios | No | Responder consultas, seguimiento y soporte |
| Identificadores del dispositivo u otros | Identificadores técnicos que pueda generar Google Analytics | No; solo con consentimiento | Analítica y medición del funcionamiento |
| Información y rendimiento de la aplicación | Datos técnicos y eventos de uso | No; solo con consentimiento | Analítica, prevención de errores y mejora |

## Tratamiento por proveedores

- Render: alojamiento de la API.
- Supabase: base de datos y almacenamiento de fotografías.
- Vercel: alojamiento del frontend.
- Resend: correos de verificación y recuperación.
- Google Analytics: medición solo tras consentimiento.
- Google Gemini y Plant.id: análisis solicitado de texto o fotografías cuando el usuario acepta el tratamiento externo.
- Open-Meteo: consulta meteorológica opcional con coordenadas aproximadas.

No declarar que los datos se venden. Para la pregunta «compartidos», confirmar en Play Console si cada proveedor cumple la excepción de proveedor de servicios de Google Play. Si existe duda contractual, declarar el tratamiento de forma conservadora y no ocultarlo.

## Eliminación y conservación

La eliminación borra la cuenta, sesiones, plantas, fotografías propiedad del usuario, diagnósticos, tareas, historial, preferencias, comentarios y suscripciones de notificaciones. La política de privacidad explica cualquier conservación temporal que pueda exigirse por seguridad u obligación legal.
