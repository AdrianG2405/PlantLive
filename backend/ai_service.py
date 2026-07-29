import json
import os
import re
from typing import Any

import ollama

TEXT_MODEL = os.getenv("OLLAMA_TEXT_MODEL", "llama3.2")
VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "gemma3:4b")

SYSTEM_PROMPT = """Eres PlantLive, especialista en botánica y cuidado de plantas.
Responde siempre en español, de forma clara, prudente y práctica. No presentes un
diagnóstico como seguro cuando falten datos. Advierte de riesgos para mascotas y
personas cuando sean relevantes."""


def _chat(prompt: str, images: list[str] | None = None) -> str:
    message: dict[str, Any] = {"role": "user", "content": prompt}
    if images:
        message["images"] = images
    response = ollama.chat(
        model=VISION_MODEL if images else TEXT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            message,
        ],
        options={
            "temperature": 0.1 if images else 0.2,
            "num_predict": 360 if images else 2048,
            "num_ctx": 4096,
        },
        keep_alive="15m",
    )
    return response["message"]["content"].replace("**", "").strip()


def _parse_json(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def preguntar_a_plantlive(pregunta: str, planta: str | None = None, contexto: str | None = None):
    return _chat(
        f"""Planta: {planta or "no especificada"}
Contexto: {contexto or "no disponible"}
Pregunta: {pregunta}

Explica observaciones, causas probables, acciones concretas, qué comprobar y qué
vigilar durante los próximos días. Usa párrafos cortos."""
    )


def buscar_plantas_con_ia(consulta: str) -> list[dict]:
    prompt = f"""Busca plantas que coincidan con: "{consulta}".
Si es un grupo genérico (por ejemplo monstera, poto, cactus, ficus), incluye entre
6 y 12 especies o variedades representativas para que el usuario pueda elegir.
Si es un nombre específico, devuelve esa planta y hasta 3 coincidencias cercanas.

Devuelve SOLAMENTE un array JSON válido, sin markdown. Cada elemento debe tener
estas claves exactas: nombreComun, nombreCientifico, categoria ("interior",
"exterior" o "ambas"), descripcion, luz, ubicacion, sustrato, riegoDias (entero),
abonoDias (entero), fertilizante, humedad, temperatura, toxicidad.

No inventes taxones. Usa un nombre científico aceptado y único por resultado.
Para cultivares, incluye el cultivar entre comillas simples en nombreCientifico.
Los intervalos son orientativos y dependen de estación, clima y humedad."""
    try:
        result = _parse_json(_chat(prompt))
        if not isinstance(result, list) or not result:
            raise ValueError
        return result[:12]
    except (json.JSONDecodeError, TypeError, KeyError, ValueError):
        raise ValueError("La IA no devolvió una lista de plantas válida")


def crear_ficha_planta(nombre_cientifico: str, nombre_comun: str | None = None) -> dict:
    prompt = f"""Crea una ficha de cuidados para esta planta concreta:
Nombre científico: {nombre_cientifico}
Nombre común: {nombre_comun or "no indicado"}

Devuelve SOLAMENTE JSON válido, sin markdown, con estas claves exactas:
nombreComun, nombreCientifico, categoria ("interior", "exterior" o "ambas"),
descripcion, luz, ubicacion, sustrato, riegoDias (entero orientativo),
abonoDias (entero orientativo), fertilizante, humedad, temperatura, toxicidad.
No cambies la especie ni inventes el taxón. Sé conciso."""
    try:
        result = _parse_json(_chat(prompt))
        if not isinstance(result, dict):
            raise ValueError
        return result
    except (json.JSONDecodeError, TypeError, KeyError, ValueError):
        raise ValueError("La IA no pudo preparar la ficha de cuidados")


def diagnosticar_imagen(images_base64: list[str], planta: str | None, sintomas: str | None) -> str:
    try:
        return _chat(
            f"""Identifica y analiza la fotografía de esta planta con prudencia.
Especie indicada por el usuario: {planta or "ninguna; debes identificarla visualmente"}.
Síntomas/contexto: {sintomas or "no indicado"}.

Primero identifica la planta usando porte, forma, nervadura, textura, disposición
de hojas, tallo y otros rasgos visibles. No confundas una variedad o cultivar con
una especie botánica. Si el usuario indicó una especie, comprueba si la imagen es
compatible; no la aceptes automáticamente.

Responde en español con un máximo de 220 palabras y exactamente estas secciones:
IDENTIFICACIÓN
LO QUE VEO
CAUSA MÁS PROBABLE
QUÉ HACER AHORA
QUÉ VIGILAR

En IDENTIFICACIÓN indica nombre común, nombre científico y confianza (alta, media
o baja). Si no puedes llegar a especie, indica el género o hasta 3 candidatas y
qué fotografía permitiría diferenciarlas.

Usa frases breves y como máximo 3 acciones numeradas. No uses Markdown, asteriscos,
tablas, introducciones ni repitas información. Adapta los cuidados a la
identificación, pero distingue observación de hipótesis. Si la imagen no permite
identificar el problema, dilo claramente y pide solo el dato o foto adicional más
útil. No diagnostiques una enfermedad concreta sin señales suficientes.""",
            images=images_base64,
        )
    except ollama.ResponseError as error:
        if error.status_code == 404:
            raise RuntimeError(
                f"Falta el modelo visual '{VISION_MODEL}'. Instálalo con: "
                f"ollama pull {VISION_MODEL}"
            ) from error
        raise
