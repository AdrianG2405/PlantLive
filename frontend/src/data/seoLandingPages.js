export const seoLandingPages = [
  {
    slug: "aplicacion-cuidar-plantas",
    kicker: "APP PARA CUIDAR PLANTAS",
    title: "Aplicación para cuidar plantas y organizar sus cuidados",
    description: "PlantLive es una aplicación para cuidar plantas: identifica especies, organiza riegos, guarda tu colección y consulta problemas frecuentes.",
    intro: "PlantLive reúne en un solo lugar la identificación, el calendario y la información que necesitas para cuidar tus plantas de interior sin depender de rutinas genéricas.",
    sections: [
      ["Tu colección de plantas", "Guarda cada especie con sus condiciones reales de luz, maceta y sustrato. Así puedes consultar sus cuidados y registrar su evolución desde un único espacio."],
      ["Cuidados adaptados a cada planta", "Consulta recomendaciones sobre riego, iluminación, abono, trasplante y sustrato. Las fechas son orientativas y siempre debes comprobar el estado real de la planta."],
      ["Ayuda cuando aparece un problema", "Añade fotografías y síntomas para revisar posibles causas de hojas amarillas, manchas, pérdida de vigor o plagas comunes."],
    ],
    faqs: [
      ["¿Para qué sirve una aplicación para cuidar plantas?", "Permite organizar especies, registrar cuidados, consultar recomendaciones y recordar próximas revisiones de riego."],
      ["¿PlantLive sirve para plantas de interior?", "Sí. Incluye guías y herramientas especialmente útiles para plantas de interior, aunque también permite buscar otras especies."],
    ],
    cta: "Buscar mi primera planta",
    ctaTo: "/#buscar",
  },
  {
    slug: "identificar-plantas-por-foto",
    kicker: "IDENTIFICAR PLANTAS",
    title: "Identificar plantas por foto de forma sencilla",
    description: "Utiliza PlantLive para identificar plantas por foto y consultar su nombre, cuidados y posibles problemas mediante imágenes claras.",
    intro: "Si no sabes qué planta tienes, una fotografía puede ayudarte a encontrar una identificación orientativa. PlantLive compara la imagen y te permite continuar con una ficha de cuidados.",
    sections: [
      ["Cómo hacer una buena fotografía", "Fotografía la planta completa con luz natural y un fondo sencillo. Añade otra imagen cercana de las hojas, flores o tallos que ayuden a distinguir la especie."],
      ["Comprueba el resultado", "Compara la forma de las hojas, el crecimiento y otros rasgos visibles. Una fotografía puede orientar, pero especies parecidas pueden necesitar más observaciones para confirmarse."],
      ["Pasa de identificar a cuidar", "Cuando encuentres la especie, consulta sus necesidades de luz y riego, añádela a tu colección y adapta los cuidados a la maceta y ubicación reales."],
    ],
    faqs: [
      ["¿Se puede identificar cualquier planta por una foto?", "Muchas plantas pueden orientarse mediante imágenes claras, pero una sola fotografía no siempre permite confirmar especies muy parecidas."],
      ["¿Qué parte de la planta debo fotografiar?", "Incluye la planta completa y primeros planos de hojas, tallos, flores o frutos, siempre que estén presentes."],
    ],
    cta: "Identificar una planta por foto",
    ctaTo: "/diagnostico",
  },
  {
    slug: "recordatorio-riego-plantas",
    kicker: "CALENDARIO DE RIEGO",
    title: "Recordatorio de riego para plantas y calendario de cuidados",
    description: "Organiza un recordatorio de riego para cada planta, consulta próximas revisiones y registra los cuidados realizados con PlantLive.",
    intro: "Un recordatorio de riego es más útil cuando indica cuándo revisar la planta, no cuando obliga a regar en una fecha fija. PlantLive organiza las próximas comprobaciones y te ayuda a registrar lo que haces.",
    sections: [
      ["Un calendario para cada planta", "Las necesidades cambian según la especie, la estación, la luz, el tamaño de la maceta y el sustrato. Organiza cada planta por separado para evitar una única rutina para toda la colección."],
      ["Comprueba antes de regar", "Cuando llegue el recordatorio, revisa la humedad a la profundidad adecuada y observa las hojas. Si el sustrato todavía está húmedo, aplaza el riego."],
      ["Registra y aprende del historial", "Marca los cuidados realizados y observa cuánto tarda en secarse cada maceta. Ese historial ayuda a ajustar las próximas revisiones a las condiciones de tu casa."],
    ],
    faqs: [
      ["¿Cada cuánto debo regar mis plantas?", "No existe una frecuencia universal. Depende de la especie, la luz, la estación, el sustrato y la maceta; comprueba siempre la humedad."],
      ["¿Un recordatorio significa que debo regar ese día?", "No. Debe servir para revisar la planta y regar únicamente si sus condiciones indican que lo necesita."],
    ],
    cta: "Crear mis recordatorios de riego",
    ctaTo: "/plantas",
  },
];

export const seoLandingPageBySlug = Object.fromEntries(seoLandingPages.map((page) => [page.slug, page]));
