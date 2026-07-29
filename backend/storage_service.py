import json
import os
import uuid
import urllib.request
from pathlib import Path

UPLOAD_DIR = Path(__file__).with_name("uploads")


def save_plant_photo(content: bytes, user_id: int, extension: str) -> str:
    filename = f"{user_id}/{uuid.uuid4().hex}.{extension}"
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "plant-photos")
    if supabase_url and service_key:
        request = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/{bucket}/{filename}",
            data=content,
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": f"image/{'jpeg' if extension in {'jpg', 'jpeg'} else extension}",
                "x-upsert": "false",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=30):
            pass
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"

    target = UPLOAD_DIR / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return f"{os.getenv('BACKEND_PUBLIC_URL', 'http://localhost:8000').rstrip('/')}/uploads/{filename}"


def delete_plant_photo(url: str, user_id: int) -> None:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "plant-photos")
    if supabase_url and service_key and url.startswith(supabase_url):
        marker = f"/storage/v1/object/public/{bucket}/"
        path = url.split(marker, 1)[-1]
        if not path.startswith(f"{user_id}/"):
            return
        request = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/{bucket}",
            data=json.dumps({"prefixes": [path]}).encode(),
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key, "Content-Type": "application/json"},
            method="DELETE",
        )
        with urllib.request.urlopen(request, timeout=20):
            pass
        return
    local_prefix = "/uploads/"
    if local_prefix in url:
        relative = url.split(local_prefix, 1)[1]
        target = (UPLOAD_DIR / relative).resolve()
        if str(target).startswith(str((UPLOAD_DIR / str(user_id)).resolve())) and target.exists():
            target.unlink()
