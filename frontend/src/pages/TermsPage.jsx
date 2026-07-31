import { Link } from "react-router-dom";

const owner = import.meta.env.VITE_LEGAL_OWNER || "RESPONSABLE PENDIENTE DE CONFIGURAR";
const contact = import.meta.env.VITE_CONTACT_EMAIL || "CONTACTO PENDIENTE DE CONFIGURAR";

export function TermsPage() {
  return <section className="section legal-page"><span className="kicker">CONDICIONES DE USO</span><h1>Condiciones de PlantLive</h1><p><b>Última actualización:</b> 31 de julio de 2026.</p>
    <h2>Titular</h2><p>El servicio es ofrecido por {owner}. Contacto: {contact}.</p>
    <h2>Finalidad del servicio</h2><p>PlantLive permite organizar plantas, programar recordatorios y obtener orientación automatizada sobre identificación y cuidados. Las fechas son recordatorios para revisar el estado real de la planta, no órdenes automáticas de riego o tratamiento.</p>
    <h2>Cuenta y uso aceptable</h2><p>Debes proporcionar información correcta, proteger tu contraseña y utilizar tu propia cuenta. No está permitido automatizar consultas, eludir límites, atacar el servicio, subir contenido ilícito o utilizarlo para perjudicar a terceros.</p>
    <h2>Inteligencia artificial</h2><p>Las respuestas pueden ser incompletas o equivocadas. Comprueba las recomendaciones antes de aplicar fertilizantes, pesticidas o tratamientos. PlantLive no garantiza la identificación exacta de una especie mediante una fotografía.</p>
    <h2>Contenido y fotografías</h2><p>Conservas los derechos sobre tus fotografías y declaras que puedes utilizarlas. Concedes únicamente el permiso técnico necesario para almacenarlas y procesarlas dentro del servicio. Las imágenes botánicas externas proceden de sus respectivos proveedores y mantienen sus licencias.</p>
    <h2>Disponibilidad y límites</h2><p>El servicio puede interrumpirse por mantenimiento, proveedores externos o límites de capacidad. Podemos aplicar límites razonables para proteger la disponibilidad y los costes.</p>
    <h2>Responsabilidad</h2><p>PlantLive no responde de daños derivados de confiar exclusivamente en recomendaciones automatizadas, salvo responsabilidades que legalmente no puedan excluirse. Ante riesgos para personas o animales consulta a un profesional.</p>
    <h2>Suspensión y cambios</h2><p>Podemos suspender cuentas que incumplan estas condiciones. Los cambios relevantes se comunicarán con una antelación razonable cuando sea posible.</p>
    <p>Consulta la <Link to="/privacidad">política de privacidad</Link>.</p>
  </section>;
}
