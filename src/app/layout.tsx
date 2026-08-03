import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contenedores · Gestión del patio y la cervecería",
  description:
    "Sistema de gestión de Contenedores: alquiler de puestos, cobros, plano del patio y punto de venta de la cervecería.",
};

export const viewport: Viewport = {
  themeColor: "#FFC200",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* El script de abajo le agrega `light-mode` al <html> antes de hidratar, así
       que la clase del cliente nunca coincide con la del servidor y React
       marcaba un error de hidratación —el globo rojo "1 Issue" del modo dev— en
       cada carga con el tema Día puesto. `suppressHydrationWarning` es la salida
       prevista para esto: solo calla la diferencia de este elemento. */
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        {/*
          Aplica el tema guardado antes de pintar, para que no parpadee.
          Va con `next/script` y no con un `<script>` suelto: React 19 avisa que
          los tags de script escritos dentro de un componente no se ejecutan al
          renderizar en el cliente, y el aviso salía como error en cada carga.
        */}
        <Script id="tema-antes-de-pintar" strategy="beforeInteractive">
          {"try{if(localStorage.getItem('patio_tema')==='dia')document.documentElement.classList.add('light-mode');" +
            "var k='contenedores_splash';" +
            "if(sessionStorage.getItem(k)==='visto'){document.documentElement.dataset.splash='listo'}else{sessionStorage.setItem(k,'visto')};" +
            // La del bar solo se lee: quien la marca es la propia intro, al
            // montarse, así que entrar por el patio no se la come.
            "if(sessionStorage.getItem('cerveceria_splash')==='visto'){document.documentElement.dataset.splashBar='listo'}}catch(e){}"}
        </Script>
      </head>
      <body className="min-h-dvh bg-[#09090b] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
