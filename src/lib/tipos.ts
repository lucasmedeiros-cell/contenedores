/**
 * Lo que devuelve toda server action del sistema. Vive suelto y sin imports
 * para que lo puedan leer tanto el servidor como los componentes de cliente:
 * `lib/servidor.ts` es `server-only` y no se puede tocar desde el navegador.
 */
export type Resultado<T = undefined> = { ok: true; datos?: T } | { ok: false; error: string };
