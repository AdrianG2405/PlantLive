# Checklist para publicar PlantLive 1.0.0

## Cuenta y ficha

- [ ] Identidad del desarrollador verificada.
- [ ] Nombre público, correo y teléfono de desarrollador confirmados.
- [ ] Aplicación creada con paquete `es.plantlive.app`.
- [ ] Idioma predeterminado: español de España.
- [ ] Categoría: Estilo de vida.
- [ ] La aplicación se declara sin anuncios.
- [ ] Descripción breve y completa copiadas desde `store-listing-es.md`.
- [ ] Correo de soporte: plantlivesupport@gmail.com.
- [ ] Sitio web: https://www.plantlive.es.
- [ ] Política: https://www.plantlive.es/privacidad.

## Contenido y políticas

- [ ] Formulario Seguridad de los datos completado usando `data-safety-es.md` y revisado contra producción.
- [ ] URL de eliminación: https://www.plantlive.es/eliminar-cuenta.
- [ ] Declarar que algunas funciones requieren cuenta y facilitar una cuenta de revisión funcional.
- [ ] Completar clasificación de contenido con respuestas reales.
- [ ] Público objetivo configurado; PlantLive no se dirige específicamente a menores.
- [ ] Declaración de permisos completada si Play Console la solicita.
- [ ] Política de privacidad visible dentro de la app.
- [ ] El domicilio/datos del responsable legal están completados antes del lanzamiento.

## Recursos

- [ ] Icono de Play Store PNG de 512 × 512, sin transparencia.
- [ ] Imagen de funciones PNG/JPG de 1024 × 500.
- [ ] Al menos 2 capturas reales de teléfono; recomendado 5–8.
- [ ] Las capturas no muestran correos, ubicaciones ni datos personales reales.
- [ ] No se prometen diagnósticos médicos ni resultados garantizados.

## Compilación

- [ ] `versionCode` es superior al último publicado.
- [ ] `versionName` es `1.0.0` para la primera entrega.
- [ ] Se usa el mismo almacén de claves y alias en todas las actualizaciones.
- [ ] El archivo `.jks` y sus contraseñas tienen al menos dos copias privadas y nunca se suben a Git.
- [ ] Generar Android App Bundle firmado (`.aab`) en modo release.
- [ ] Tras activar Play App Signing, añadir también su SHA-256 a `frontend/public/.well-known/assetlinks.json` y publicar el cambio.
- [ ] Comprobar el AAB con Android Studio y subirlo primero a prueba interna.
- [ ] Instalar desde Google Play Internal Testing, no solo mediante APK local.

## Pruebas y publicación

- [ ] Ejecutar el recorrido de `closed-test-plan.md`.
- [ ] Revisar Android Vitals y el informe previo al lanzamiento.
- [ ] Resolver bloqueos, ANR, problemas de permisos y enlaces rotos.
- [ ] Completar prueba cerrada de 12 usuarios/14 días si Play Console la exige.
- [ ] Solicitar acceso a producción y responder con resultados reales del test.
