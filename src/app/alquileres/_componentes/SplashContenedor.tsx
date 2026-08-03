import PuertasContenedor from "./PuertasContenedor";

/**
 * Intro: las dos puertas de un contenedor que se abren y dejan ver la app.
 *
 * Las puertas se renderizan en el servidor, ya cerradas, para que estén en el
 * primer frame y no aparezcan tarde. El marcador que las oculta cuando esta
 * pestaña ya vio la intro lo pone el script del layout raíz, antes de pintar:
 * acá adentro React 19 no ejecuta los `<script>` al renderizar en cliente, así
 * que el aviso salía como error y el marcador no se ponía en las navegaciones.
 */
export default function SplashContenedor() {
  return <PuertasContenedor />;
}
