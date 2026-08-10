import { Link } from "react-router-dom";

const owner = import.meta.env.VITE_LEGAL_OWNER || "Adrián Gómez Núñez";
const contact = import.meta.env.VITE_CONTACT_EMAIL || "plantlivesupport@gmail.com";
const address = import.meta.env.VITE_LEGAL_ADDRESS?.trim();

export function LegalPage() {
  return <section className="section legal-page"><span className="kicker">PRIVACIDAD</span><h1>Cómo trata PlantLive tus datos</h1><p><b>Última actualización:</b> 31 de julio de 2026.</p>
    <h2>Responsable</h2><p><b>{owner}</b>{address && <><br />Domicilio: {address}</>}<br />Contacto para privacidad: {contact}</p>
    <h2>Estado del servicio</h2><p>PlantLive es un servicio web para organizar y orientar el cuidado de plantas. Actualmente no incluye pagos ni publicidad.</p>
    <h2>Datos y finalidad</h2><p>Tratamos nombre, correo electrónico, sesiones, plantas, calendario, preferencias, fotografías aportadas voluntariamente, diagnósticos e historial de cuidados para crear la cuenta, prestar el servicio, protegerlo frente a abusos y enviar recordatorios solicitados. Si activas el clima local, guardamos coordenadas aproximadas para adaptar los intervalos; puedes desactivarlo desde Ajustes.</p>
    <h2>Base jurídica</h2><p>La gestión de la cuenta y del jardín es necesaria para prestar el servicio solicitado. Los recordatorios, el análisis externo y la medición estadística se basan en las preferencias y el consentimiento del usuario, que puede rechazarse cuando se solicita.</p>
    <h2>Cookies y medición</h2><p>PlantLive puede utilizar Google Analytics únicamente después de recibir autorización. Esta medición permite conocer de forma agregada las páginas visitadas y el tipo de dispositivo para mejorar el servicio. Si se elige «Solo necesarias», Google Analytics no se carga.</p>
    <h2>Inteligencia artificial y proveedores</h2><p>Cuando aceptas el análisis externo, las fotografías y el contexto necesario pueden enviarse a Plant.id y Google Gemini. El clima opcional consulta Open-Meteo con coordenadas aproximadas. La infraestructura utiliza Vercel, Render y Supabase; el correo utiliza Resend. Cada proveedor puede tratar datos técnicos conforme a sus condiciones. No utilices el servicio para fotografías de personas ni documentos personales.</p>
    <h2>Conservación</h2><p>Conservamos los datos mientras la cuenta esté activa. Los enlaces de recuperación caducan y las sesiones tienen duración limitada. Al eliminar la cuenta se inicia la supresión de plantas, fotografías, diagnósticos, tareas y sesiones, salvo información que deba conservarse temporalmente por obligación legal o seguridad.</p>
    <h2>Tus derechos</h2><p>Desde Ajustes puedes rectificar preferencias, descargar una copia de tus datos y eliminar la cuenta. También puedes solicitar acceso, rectificación, supresión, limitación, oposición o portabilidad escribiendo a {contact}. Si consideras que el tratamiento no es correcto, puedes reclamar ante la autoridad de protección de datos correspondiente.</p>
    <h2>Seguridad</h2><p>Las contraseñas se almacenan mediante derivación criptográfica, las conexiones públicas utilizan HTTPS y se aplican controles de sesión y límites de uso. Ningún sistema es completamente infalible; comunica cualquier incidencia a {contact}.</p>
    <h2>Menores</h2><p>PlantLive no está dirigido a menores que no puedan consentir válidamente el tratamiento de sus datos. Si eres menor, utiliza la aplicación con autorización de tu representante legal.</p>
    <h2>Diagnósticos orientativos</h2><p>La identificación y los cuidados generados por IA pueden contener errores. No sustituyen a un viverista, agrónomo, laboratorio, veterinario, toxicólogo ni profesional sanitario. Ante una posible intoxicación, contacta con los servicios especializados.</p>
    <p>Consulta también las <Link to="/condiciones">condiciones de uso</Link>.</p>
  </section>;
}
