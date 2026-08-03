import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSesion } from "@/lib/auth";

/**
 * Subida de la foto de un producto.
 *
 * Los archivos van a `public/productos/`, que Next sirve tal cual: no hace
 * falta un bucket ni volver a compilar, y la app anda igual en la LAN sin
 * internet. Guardamos la ruta —no el binario— en la columna `imagen`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

const TOPE = 5 * 1024 * 1024;

/** `Chopp Paceña` → `chopp-pacena`, para que el archivo se entienda a simple vista. */
function aSlug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "producto"
  );
}

export async function POST(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const datos = await req.formData();
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No llegó ninguna imagen." }, { status: 400 });
  }

  const extension = TIPOS[archivo.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá PNG, JPG, WEBP o AVIF." },
      { status: 415 },
    );
  }
  if (archivo.size > TOPE) {
    return NextResponse.json({ error: "La imagen no puede pasar de 5 MB." }, { status: 413 });
  }

  const carpeta = path.join(process.cwd(), "public", "productos");
  await mkdir(carpeta, { recursive: true });

  // El sufijo evita pisar la foto anterior y, de paso, que el navegador siga
  // mostrando la vieja desde su caché.
  const nombre = `${aSlug(String(datos.get("nombre") ?? ""))}-${Date.now().toString(36)}.${extension}`;
  await writeFile(path.join(carpeta, nombre), Buffer.from(await archivo.arrayBuffer()));

  return NextResponse.json({ ruta: `/productos/${nombre}` });
}
