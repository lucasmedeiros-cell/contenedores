import PuertasContenedor from "./PuertasContenedor";

/**
 * Intro: las dos puertas de un contenedor que se abren y dejan ver la app.
 *
 * Las puertas se renderizan en el servidor, ya cerradas, para que estén en el
 * primer frame y no aparezcan tarde. El script de abajo corre antes de pintar:
 * si esta pestaña ya vio la intro, marca el documento y el CSS las oculta sin
 * que llegue a haber ni un parpadeo.
 */
export default function SplashContenedor() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var k='contenedores_splash';" +
            "if(sessionStorage.getItem(k)==='visto'){document.documentElement.dataset.splash='listo'}" +
            "else{sessionStorage.setItem(k,'visto')}}catch(e){}",
        }}
      />
      <PuertasContenedor />
    </>
  );
}
