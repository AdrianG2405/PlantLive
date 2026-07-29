from PIL import Image


def preparar_imagen(ruta: str):

    imagen = Image.open(ruta)

    imagen.thumbnail(
        (1600, 1600)
    )

    imagen.save(
        ruta,
        optimize=True
    )

    return ruta