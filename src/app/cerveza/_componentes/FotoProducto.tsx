"use client";

/**
 * La cara del producto: su foto si la tiene, y si no el chopp dibujado.
 *
 * Las fotos vienen recortadas, sin fondo, así que se muestran sueltas sobre el
 * gajo —nada de recuadros ni bordes— y con `object-contain` para que una lata
 * angosta y una torre de 2,5 L convivan sin deformarse. La sombra despega la
 * imagen del amarillo del gajo activo.
 */
export function FotoProducto({
  producto,
  className = "",
  oscuro = false,
}: {
  producto: { nombre: string; imagen: string | null; color: string };
  className?: string;
  /** `true` cuando va sobre el gajo amarillo: cambia el tono de la sombra. */
  oscuro?: boolean;
}) {
  if (producto.imagen) {
    return (
      /* La foto vive en public/ y se dibuja dentro de un <foreignObject>,
         donde next/image no puede medirse. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={producto.imagen}
        alt={producto.nombre}
        className={`h-full w-full object-contain ${className}`}
        style={{
          filter: oscuro
            ? "drop-shadow(0 3px 6px rgba(0,0,0,.35))"
            : "drop-shadow(0 3px 8px rgba(0,0,0,.55))",
        }}
      />
    );
  }

  return <Vaso color={producto.color} oscuro={oscuro} />;
}

/** Chopp dibujado en SVG: espuma, cuerpo con burbujas y asa. */
export function Vaso({ color, oscuro }: { color: string; oscuro: boolean }) {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full">
      <defs>
        <linearGradient id={`cerv-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.75" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      {/* asa */}
      <path
        d="M58 40h7a11 11 0 0 1 0 22h-7"
        fill="none"
        stroke={oscuro ? "#00000055" : "#ffffff40"}
        strokeWidth="5"
      />
      {/* cuerpo */}
      <rect
        x="16"
        y="26"
        width="44"
        height="62"
        rx="7"
        fill={`url(#cerv-${color.replace("#", "")})`}
      />
      <rect
        x="16"
        y="26"
        width="44"
        height="62"
        rx="7"
        fill="none"
        stroke={oscuro ? "#00000040" : "#ffffff35"}
        strokeWidth="2"
      />
      {/* espuma */}
      <path
        d="M16 30c0-7 5-11 11-10 2-6 9-8 14-4 5-3 12-1 13 5 6 0 8 5 6 9z"
        fill={oscuro ? "#fffdf5" : "#fefce8"}
      />
      {/* burbujas */}
      {[
        [26, 52, 2.4],
        [36, 66, 1.8],
        [46, 46, 2],
        [31, 78, 1.5],
        [50, 72, 1.7],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" opacity={oscuro ? 0.45 : 0.3} />
      ))}
    </svg>
  );
}
