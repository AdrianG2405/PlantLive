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
  careHistory: (plantId) => request(`/user/plants/${plantId}/care`),
  addCare: (plantId, values) => request(`/user/plants/${plantId}/care`, { method: "POST", body: JSON.stringify(values) }),
  dashboard: () => request("/user/dashboard"),
  tasks: () => request("/user/tasks"),
  addTask: (values) => request("/user/tasks", { method: "POST", body: JSON.stringify(values) }),
  updateTask: (id, values) => request(`/user/tasks/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
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

export async function searchPlants(query) {
  const normalizedInput = normalizeTaxon(query);
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

export async function createCareProfile(plant) {
  const care = await request("/plantas/ficha-ia", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreCientifico: plant.nombreCientifico, nombreComun: plant.nombreComun }),
  });
  return { ...plant, ...care, id: plant.id, imagen: plant.imagen };
}

export function diagnosePlant({ imagenes, sintomas, planta }) {
  return request("/diagnosticar", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenes, sintomas, planta }),
  });
}
