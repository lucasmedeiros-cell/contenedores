import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy hacia el sistema de Tickets.
 *
 * El navegador nunca le habla a Tickets directamente, por dos razones:
 *  1. La API key identifica a esta instalación. Si el fetch saliera del cliente,
 *     viajaría en el bundle y cualquiera podría abrir tickets a nuestro nombre.
 *  2. Tickets no habilita el dominio de cada instalación, así que desde el
 *     navegador habría CORS. Desde el servidor no.
 *
 * De paso, acá se enriquece el ticket con el contexto (proyecto, origen y URL),
 * que es lo que permite entenderlo sin repreguntarle nada a quien reportó.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TICKETS_API = process.env.TICKETS_API || "https://tickets.petroboxinc.com/api";
const TICKETS_API_KEY = process.env.TICKETS_API_KEY || "";
const TICKETS_PROJECT = process.env.TICKETS_PROJECT || "Contenedores";

const origenLabel = (s: string) =>
  s === "crm" ? "CRM / Admin" : s === "pc" ? "Programa de PC" : s === "mobile" ? "App de celular" : "Web";

export async function POST(req: NextRequest) {
  if (!TICKETS_API_KEY) {
    return NextResponse.json(
      { error: "El reporte de bugs no está configurado (falta TICKETS_API_KEY)." },
      { status: 503 },
    );
  }

  // La web manda multipart porque puede adjuntar captura; otros clientes, JSON.
  const ct = req.headers.get("content-type") || "";
  let tipo = "error";
  let titulo = "";
  let descripcion = "";
  let email = "";
  let surface = "web";
  let url = "";
  let imagen: File | null = null;

  if (ct.includes("application/json")) {
    const b = await req.json();
    tipo = b.tipo === "optimizacion" ? "optimizacion" : "error";
    titulo = String(b.titulo ?? "").trim();
    descripcion = String(b.descripcion ?? "").trim();
    email = String(b.email ?? "").trim();
    surface = String(b.surface ?? "web").trim();
    url = String(b.url ?? "").trim();
  } else {
    const f = await req.formData();
    tipo = (f.get("tipo") as string) === "optimizacion" ? "optimizacion" : "error";
    titulo = ((f.get("titulo") as string) || "").trim();
    descripcion = ((f.get("descripcion") as string) || "").trim();
    email = ((f.get("email") as string) || "").trim();
    surface = ((f.get("surface") as string) || "web").trim();
    url = ((f.get("url") as string) || "").trim();
    const img = f.get("imagen");
    if (img && typeof img !== "string" && (img as File).size > 0) imagen = img as File;
  }

  if (!titulo || !descripcion) {
    return NextResponse.json({ error: "Título y descripción son obligatorios." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "El correo es obligatorio." }, { status: 400 });
  }

  const contexto =
    `\n\n--- Contexto ---\n` +
    `Plataforma: ${TICKETS_PROJECT}\n` +
    `Origen: ${origenLabel(surface)}\n` +
    `URL: ${url || "N/A"}`;

  const out = new FormData();
  out.append("tipo", tipo);
  out.append("titulo", `[${TICKETS_PROJECT}] ${titulo}`);
  out.append("descripcion", descripcion + contexto);
  out.append("email", email);
  // OJO: el campo va en PLURAL. Con "imagen" el ticket se crea igual pero la
  // captura se pierde en silencio.
  if (imagen) out.append("imagenes", imagen, imagen.name || "captura.jpg");

  let r: Response;
  try {
    r = await fetch(`${TICKETS_API}/public/report`, {
      method: "POST",
      headers: { "X-Api-Key": TICKETS_API_KEY },
      body: out,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar al sistema de Tickets." },
      { status: 502 },
    );
  }

  const data = await r.json().catch(() => ({}) as Record<string, string>);
  if (!r.ok) {
    const status = r.status >= 400 && r.status < 600 ? r.status : 502;
    return NextResponse.json(
      { error: data?.mensaje || data?.error || "No se pudo enviar el reporte." },
      { status },
    );
  }

  return NextResponse.json({ numero_ticket: data.numero_ticket ?? null });
}
