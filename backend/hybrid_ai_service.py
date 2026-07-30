import json
import os
import urllib.error
import urllib.parse
import urllib.request

PLANT_ID_URL = "https://plant.id/api/v3"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def advanced_ai_configured() -> bool:
    return bool(os.getenv("PLANT_ID_API_KEY") and os.getenv("GEMINI_API_KEY"))


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 75) -> dict:
    request = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers}, method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API externa respondió {error.code}: {detail[:300]}") from error
    except urllib.error.URLError as error:
        raise RuntimeError("No se pudo conectar con el análisis avanzado") from error


def _plant_id_analysis(images_base64: list[str]) -> dict:
    headers = {"Api-Key": os.environ["PLANT_ID_API_KEY"]}
    common = {"images": images_base64, "similar_images": False}
    identification = _post_json(
        f"{PLANT_ID_URL}/identification",
        {**common, "classification_level": "species"}, headers,
    )
    health = _post_json(f"{PLANT_ID_URL}/health_assessment", common, headers)
    return {"identification": identification, "health": health}


def _compact_plant_id(raw: dict) -> dict:
    identification = raw.get("identification", {}).get("result", {})
    health = raw.get("health", {}).get("result", {})
    return {
        "is_plant": identification.get("is_plant"),
        "species_candidates": [
            {"name": item.get("name"), "probability": item.get("probability")}
            for item in identification.get("classification", {}).get("suggestions", [])[:3]
        ],
        "is_healthy": health.get("is_healthy"),
        "condition_candidates": [
            {
                "name": item.get("name"),
                "probability": item.get("probability"),
                "description": item.get("details", {}).get("description"),
            }
            for item in health.get("disease", {}).get("suggestions", [])[:4]
        ],
    }


def _gemini_diagnosis(images_base64: list[str], context: dict, planta: str | None, sintomas: str | None) -> str:
    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    prompt = f"""Eres PlantLive, especialista prudente en botánica.
Analiza la foto junto con el clasificador especializado Plant.id.
Planta indicada: {planta or "ninguna"}
Contexto: {sintomas or "ninguno"}
Plant.id: {json.dumps(context, ensure_ascii=False)}

Contrasta las probabilidades con lo visible; no las trates como certezas.
Responde en español, máximo 220 palabras, texto plano, sin Markdown ni asteriscos.
Usa exactamente: IDENTIFICACIÓN, LO QUE VEO, CAUSA MÁS PROBABLE,
QUÉ HACER AHORA y QUÉ VIGILAR. Incluye nombre común, científico y confianza.
Máximo 3 acciones. Si falta evidencia, pide una sola foto o dato concreto."""
    payload = {
        "contents": [{"role": "user", "parts": [
            *[{"inlineData": {"mimeType": "image/jpeg", "data": image}} for image in images_base64],
            {"text": prompt},
        ]}],
        "generationConfig": {"maxOutputTokens": 500},
    }
    query = urllib.parse.urlencode({"key": os.environ["GEMINI_API_KEY"]})
    response = _post_json(f"{GEMINI_URL}/{model}:generateContent?{query}", payload, {}, 90)
    candidates = response.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini no devolvió un diagnóstico")
    return text.replace("**", "").strip()


def diagnosticar_avanzado(images_base64: list[str], planta: str | None, sintomas: str | None) -> str:
    context = _compact_plant_id(_plant_id_analysis(images_base64))
    return _gemini_diagnosis(images_base64, context, planta, sintomas)
