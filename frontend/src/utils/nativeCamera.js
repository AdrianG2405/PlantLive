import { Capacitor } from "@capacitor/core";
import { Camera, CameraDirection, CameraResultType, CameraSource } from "@capacitor/camera";

function captureFromBrowser(onChange) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.addEventListener("change", async () => {
    try {
      if (input.files?.length) await onChange({ target: input });
    } finally {
      input.remove();
    }
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

export async function capturePhoto(onChange, onError) {
  // In a mobile browser the native Capacitor bridge does not exist. Opening the
  // file input synchronously also preserves Chrome's required user gesture.
  if (!Capacitor.isNativePlatform()) {
    captureFromBrowser(onChange);
    return;
  }
  try {
    let permissions = await Camera.checkPermissions();
    if (permissions.camera !== "granted") {
      permissions = await Camera.requestPermissions({ permissions: ["camera"] });
    }
    if (permissions.camera !== "granted") {
      onError?.("PlantLive necesita permiso de cámara para hacer fotografías.");
      return;
    }
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      direction: CameraDirection.Rear,
      resultType: CameraResultType.Uri,
      quality: 88,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.webPath) return;
    const blob = await fetch(photo.webPath).then((response) => response.blob());
    const extension = photo.format === "png" ? "png" : "jpeg";
    const file = new File([blob], `plantlive-${Date.now()}.${extension}`, {
      type: blob.type || `image/${extension}`,
    });
    await onChange({ target: { files: [file], value: "" } });
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/cancel|cancelad|user cancelled/i.test(message)) return;
    onError?.("No se pudo abrir la cámara. Revisa el permiso de cámara de PlantLive.");
  }
}
