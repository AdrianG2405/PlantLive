# PlantLive para Android

La aplicación Android usa Capacitor y reutiliza el frontend de PlantLive. Su
identificador permanente es `es.plantlive.app` y consume la API pública de
`https://api.plantlive.es`.

## Requisitos locales

1. Instala Android Studio y acepta la instalación recomendada del Android SDK.
2. En SDK Manager, confirma que está instalado Android API 36.
3. Abre Android Studio y selecciona `frontend/android`.

## Probar en un móvil o emulador

Desde `frontend` ejecuta:

```bash
npm run android:sync
npm run android:open
```

En Android Studio selecciona un emulador o un teléfono con depuración USB y pulsa
Run. Cada vez que cambie React, ejecuta de nuevo `npm run android:sync`.

## Crear la versión para Google Play

En Android Studio usa **Build > Generate Signed App Bundle or APK > Android App
Bundle**. Crea y conserva fuera del repositorio el archivo de firma `.jks`, su
alias y sus contraseñas. Google Play recibe el archivo `.aab`, no el proyecto.

Antes de publicar deben completarse la ficha de Play Console, política de
privacidad, declaración de seguridad de datos, clasificación de contenido,
capturas, icono, gráfico promocional y pruebas internas.
