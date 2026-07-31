const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const PLANTAE_TAXON_ID = "47126";

async function request(path, options) {
  const token = localStorage.getItem("plantlive-token");
  const isForm = options?.body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options?.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "No se pudo completar la solicitud");
  return data;
}

export const authApi = {
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  logoutAll: () => request("/auth/logout-all", { method: "POST" }),
  changePassword: (currentPassword, newPassword) => request("/auth/change-password", {
    method: "POST", body: JSON.stringify({ currentPassword, newPassword }),
  }),
  resendVerification: () => request("/auth/resend-verification", { method: "POST" }),
  verifyEmail: (token) => request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
};

export const userDataApi = {
  plants: () => request("/user/plants"),
  addPlant: (plant) => request("/user/plants", { method: "POST", body: JSON.stringify(plant) }),
  updatePlant: (id, values) => request(`/user/plants/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
  removePlant: (id) => request(`/user/plants/${id}`, { method: "DELETE" }),
  diagnoses: () => request("/user/diagnoses"),
  settings: () => request("/user/settings"),
  updateSettings: (values) => request("/user/settings", { method: "PATCH", body: JSON.stringify(values) }),
  exportData: () => request("/user/export"),
  deleteAccount: (password, confirmation) => request("/user/account", {
    method: "DELETE", body: JSON.stringify({ password, confirmation }),
  }),
  careHistory: (plantId) => request(`/user/plants/${plantId}/care`),
  addCare: (plantId, values) => request(`/user/plants/${plantId}/care`, { method: "POST", body: JSON.stringify(values) }),
  dashboard: () => request("/user/dashboard"),
  tasks: () => request("/user/tasks"),
  addTask: (values) => request("/user/tasks", { method: "POST", body: JSON.stringify(values) }),
  updateTask: (id, values) => request(`/user/tasks/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
  feedback: (values) => request("/user/feedback", { method: "POST", body: JSON.stringify(values) }),
  savePushSubscription: (subscription) => request("/user/push-subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
  uploadPhoto: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/user/photos", { method: "POST", body });
  },
  removePhoto: (url) => request("/user/photos", { method: "DELETE", body: JSON.stringify({ url }) }),
};

const normalizeTaxon = (name = "") =>
  name.toLowerCase().replace(/[×'".,]/g, "").replace(/\s+/g, " ").trim();

const GROUP_ALIASES = {
  mosntera: { name: "Monstera", rank: "genus" },
  monstera: { name: "Monstera", rank: "genus" },
  poto: { name: "Epipremnum", rank: "genus" },
  potos: { name: "Epipremnum", rank: "genus" },
  pothos: { name: "Epipremnum", rank: "genus" },
  potho: { name: "Epipremnum", rank: "genus" },
  photos: { name: "Epipremnum", rank: "genus" },
  photo: { name: "Epipremnum", rank: "genus" },
  cactus: { name: "Cactaceae", rank: "family" },
  "cáctus": { name: "Cactaceae", rank: "family" },
};

const RETAIL_GROUPS = {
  suculenta: [
    "Echeveria", "Haworthia", "Crassula", "Sedum", "Sempervivum",
    "Lithops", "Gasteria", "Graptopetalum", "Pachyphytum", "Aeonium",
    "Kalanchoe", "Aloe",
  ],
  suculentas: [
    "Echeveria", "Haworthia", "Crassula", "Sedum", "Sempervivum",
    "Lithops", "Gasteria", "Graptopetalum", "Pachyphytum", "Aeonium",
    "Kalanchoe", "Aloe",
  ],
};

// iNaturalist ordena por observaciones silvestres. Esta lista hace que las
// especies habituales en viveros aparezcan antes sin ocultar el catálogo global.
const COMMERCIAL_SPECIES = [
  "Monstera deliciosa", "Monstera adansonii", "Monstera dubia", "Monstera siltepecana",
  "Monstera standleyana", "Epipremnum aureum", "Epipremnum pinnatum",
  "Philodendron hederaceum", "Philodendron erubescens", "Scindapsus pictus",
  "Ficus elastica", "Ficus lyrata", "Ficus benjamina", "Ficus pumila",
  "Goeppertia orbifolia", "Goeppertia makoyana", "Goeppertia ornata",
  "Goeppertia insignis", "Maranta leuconeura", "Stromanthe sanguinea",
  "Peperomia obtusifolia", "Peperomia caperata", "Peperomia argyreia",
  "Pilea peperomioides", "Fittonia albivenis", "Chlorophytum comosum",
  "Spathiphyllum wallisii", "Zamioculcas zamiifolia", "Dracaena trifasciata",
  "Dracaena angolensis", "Dracaena marginata", "Dracaena fragrans",
  "Aglaonema commutatum", "Syngonium podophyllum", "Tradescantia zebrina",
  "Begonia maculata", "Begonia rex", "Heptapleurum arboricola",
  "Pachira aquatica", "Beaucarnea recurvata", "Saintpaulia ionantha",
  "Anthurium andraeanum", "Anthurium clarinervium", "Alocasia zebrina",
  "Ceropegia woodii", "Dischidia nummularia", "Hoya carnosa", "Hoya kerrii",
  "Echeveria elegans", "Echeveria agavoides", "Echeveria lilacina",
  "Haworthia cooperi", "Haworthia cymbiformis", "Haworthiopsis attenuata",
  "Crassula ovata", "Crassula perforata", "Sedum morganianum",
  "Sedum rubrotinctum", "Pachyphytum oviferum", "Graptopetalum paraguayense",
  "Kalanchoe tomentosa", "Sempervivum tectorum", "Lithops aucampiae",
  "Mammillaria elongata", "Mammillaria gracilis", "Gymnocalycium mihanovichii",
  "Schlumbergera truncata", "Rhipsalis baccifera", "Opuntia microdasys",
].map(normalizeTaxon);

const COMMERCIAL_GENERA = new Set(COMMERCIAL_SPECIES.map((name) => name.split(" ")[0]));

const commercialRank = (taxon) => {
  const name = normalizeTaxon(taxon.name);
  const exact = COMMERCIAL_SPECIES.indexOf(name);
  if (exact >= 0) return exact;
  return COMMERCIAL_GENERA.has(name.split(" ")[0]) ? 500 : 1000;
};

const isPlantTaxon = (taxon) =>
  taxon.iconic_taxon_name === "Plantae" ||
  (taxon.ancestor_ids || []).map(String).includes(PLANTAE_TAXON_ID) ||
  String(taxon.ancestry || "").split("/").includes(PLANTAE_TAXON_ID);

const spanishPlantName = (taxon, genus) => {
  if (genus?.name === "Epipremnum") {
    if (taxon.name === "Epipremnum aureum") return "Poto dorado";
    const variety = taxon.name.split(" ").slice(1).join(" ");
    return `Poto ${variety || taxon.name}`;
  }
  return taxon.preferred_common_name ||
    `Especie de ${genus?.preferred_common_name || genus?.name || taxon.name.split(" ")[0]}`;
};

async function findWikimediaPhoto(scientificName) {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: `"${scientificName}"`,
    gsrnamespace: "6", gsrlimit: "5", prop: "imageinfo",
    iiprop: "url", iiurlwidth: "900", format: "json", origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!response.ok) return null;
  const pages = Object.values((await response.json()).query?.pages || {});
  const expected = normalizeTaxon(scientificName);
  const page = pages.find((item) => normalizeTaxon(item.title).includes(expected));
  return page?.imageinfo?.[0]?.thumburl || null;
}

export async function findPlantPhoto(scientificName) {
  const params = new URLSearchParams({ q: scientificName, rank: "species", taxon_id: PLANTAE_TAXON_ID, per_page: "10", locale: "es" });
  const response = await fetch(`https://api.inaturalist.org/v1/taxa?${params}`);
  if (!response.ok) return null;
  const data = await response.json();
  const expected = normalizeTaxon(scientificName);
  const taxon = data.results?.filter(isPlantTaxon).find((item) =>
    normalizeTaxon(item.name) === expected || normalizeTaxon(item.preferred_common_name) === expected
  );
  return taxon?.default_photo?.medium_url?.replace("medium.", "large.") || null;
}

async function searchRetailGroup(groupNames) {
  const groups = await Promise.all(groupNames.map(async (groupName) => {
    const groupParams = new URLSearchParams({
      q: groupName, rank: "genus", taxon_id: PLANTAE_TAXON_ID,
      per_page: "3", locale: "es",
    });
    const groupResponse = await fetch(`https://api.inaturalist.org/v1/taxa?${groupParams}`);
    if (!groupResponse.ok) return [];
    const candidates = ((await groupResponse.json()).results || []).filter(isPlantTaxon);
    const genus = candidates.find((item) => normalizeTaxon(item.name) === normalizeTaxon(groupName));
    if (!genus) return [];

    const speciesParams = new URLSearchParams({
      taxon_id: String(genus.id), rank: "species", per_page: "8",
      order_by: "observations_count", order: "desc", locale: "es",
    });
    const speciesResponse = await fetch(`https://api.inaturalist.org/v1/taxa?${speciesParams}`);
    if (!speciesResponse.ok) return [];
    return ((await speciesResponse.json()).results || [])
      .filter(isPlantTaxon)
      .map((taxon) => ({ taxon, genus }));
  }));

  const unique = new Map();
  groups.flat().forEach((item) => unique.set(item.taxon.id, item));
  return [...unique.values()]
    .sort((a, b) =>
      commercialRank(a.taxon) - commercialRank(b.taxon) ||
      Number(Boolean(b.taxon.default_photo)) - Number(Boolean(a.taxon.default_photo))
    )
    .map(({ taxon, genus }) => ({
      id: `inat-${taxon.id}`,
      taxonId: taxon.id,
      nombreComun: spanishPlantName(taxon, genus),
      nombreCientifico: taxon.name,
      categoria: "Suculenta compacta",
      descripcion: `Suculenta ornamental del género ${genus.name}, habitual en colecciones y viveros.`,
      imagen: taxon.default_photo?.medium_url?.replace("medium.", "large.") || null,
    }));
}

export async function searchPlants(query) {
  const normalizedInput = normalizeTaxon(query);
  const retailGroup = RETAIL_GROUPS[normalizedInput];
  if (retailGroup) {
    const retailResults = await searchRetailGroup(retailGroup);
    if (retailResults.length) return retailResults;
  }
  const alias = GROUP_ALIASES[normalizedInput];
  const catalogQuery = alias?.name || query;
  const catalogRank = alias?.rank || "genus";
  const genusParams = new URLSearchParams({ q: catalogQuery, rank: catalogRank, taxon_id: PLANTAE_TAXON_ID, per_page: "5", locale: "es" });
  const genusResponse = await fetch(`https://api.inaturalist.org/v1/taxa?${genusParams}`);
  if (!genusResponse.ok) throw new Error("No se pudo consultar el catálogo botánico");
  const genusData = await genusResponse.json();
  const normalizedQuery = normalizeTaxon(catalogQuery).replace(/s$/, "");
  const plantGroups = (genusData.results || []).filter(isPlantTaxon);
  const genus = plantGroups.find((taxon) =>
    normalizeTaxon(taxon.name) === normalizedQuery ||
    normalizeTaxon(taxon.preferred_common_name).includes(normalizedQuery)
  ) || plantGroups[0];

  let taxa = [];
  if (genus) {
    const speciesParams = new URLSearchParams({
      taxon_id: genus.id, rank: "species", per_page: "200",
      order_by: "observations_count", order: "desc", locale: "es",
    });
    const response = await fetch(`https://api.inaturalist.org/v1/taxa?${speciesParams}`);
    if (!response.ok) throw new Error("No se pudieron cargar las especies");
    taxa = ((await response.json()).results || []).filter(isPlantTaxon);
  } else {
    const speciesParams = new URLSearchParams({ q: query, rank: "species", taxon_id: PLANTAE_TAXON_ID, per_page: "30", locale: "es" });
    const response = await fetch(`https://api.inaturalist.org/v1/taxa?${speciesParams}`);
    taxa = response.ok ? ((await response.json()).results || []).filter(isPlantTaxon) : [];
  }

  if (!taxa.length) throw new Error("No encontramos especies para esa búsqueda");
  taxa.sort((a, b) =>
    commercialRank(a) - commercialRank(b) ||
    Number(Boolean(b.default_photo)) - Number(Boolean(a.default_photo)) ||
    (b.observations_count || 0) - (a.observations_count || 0)
  );
  return Promise.all(taxa.map(async (taxon) => ({
      id: `inat-${taxon.id}`,
      taxonId: taxon.id,
      nombreComun: spanishPlantName(taxon, genus),
      nombreCientifico: taxon.name,
      categoria: genus?.name || "planta",
      descripcion: `Especie aceptada de ${genus?.name || taxon.name.split(" ")[0]}.`,
      imagen: taxon.default_photo?.medium_url?.replace("medium.", "large.") ||
        await findWikimediaPhoto(taxon.name).catch(() => null),
    })));
}

export function seasonalCareDays(plant, type = "riego", date = new Date()) {
  const month = date.getMonth();
  const season = month >= 2 && month <= 4 ? "Primavera"
    : month >= 5 && month <= 7 ? "Verano"
      : month >= 8 && month <= 10 ? "Otono" : "Invierno";
  const seasonalValue = plant[`${type}${season}Dias`];
  const fallbackValue = plant[`${type}Dias`];
  return Number(seasonalValue ?? fallbackValue ?? (type === "riego" ? 7 : 30));
}

export async function createCareProfile(plant, contexto = {}) {
  try {
    const care = await request("/plantas/ficha-ia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreCientifico: plant.nombreCientifico,
        nombreComun: plant.nombreComun,
        contexto,
      }),
    });
    const complete = { ...plant, ...care, id: plant.id, imagen: plant.imagen, careProfilePending: false };
    return {
      ...complete,
      riegoDias: seasonalCareDays(complete, "riego"),
      abonoDias: seasonalCareDays(complete, "abono"),
    };
  } catch {
    return {
      ...plant,
      categoria: plant.categoria || "interior",
      descripcion: plant.descripcion || "Ficha inicial pendiente de personalizar.",
      luz: "Luz abundante sin sol fuerte hasta confirmar la especie",
      ubicacion: "Lugar luminoso, ventilado y protegido de temperaturas extremas",
      sustrato: "Sustrato aireado y drenante",
      riegoDias: 10,
      riegoPrimaveraDias: 8,
      riegoVeranoDias: 6,
      riegoOtonoDias: 10,
      riegoInviernoDias: 14,
      riegoIndicador: "Comprueba la humedad del sustrato antes de regar",
      abonoDias: 30,
      abonoPrimaveraDias: 30,
      abonoVeranoDias: 30,
      abonoOtonoDias: 45,
      abonoInviernoDias: 60,
      abonoIndicador: "Aplicar a media dosis y con el sustrato previamente húmedo",
      fertilizante: "Fertilizante equilibrado a media dosis",
      humedad: "Moderada",
      temperatura: "18–26 °C",
      toxicidad: "Consulta la especie antes de acercarla a mascotas o niños",
      confianzaCuidados: "baja",
      advertencias: "Ficha provisional: actualízala con tus condiciones o consulta una fuente botánica especializada.",
      careProfilePending: true,
    };
  }
}

export function diagnosePlant({ imagenes, sintomas, planta }) {
  return request("/diagnosticar", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenes, sintomas, planta }),
  });
}

export function askPlantLive({ pregunta, planta, contexto, historial }) {
  return request("/preguntar", {
    method: "POST",
    body: JSON.stringify({ pregunta, planta, contexto, historial }),
  });
}
