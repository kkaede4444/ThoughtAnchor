# ThoughtAnchor

[Todos los idiomas](../README.md) · [Descargar Windows / Android](https://github.com/kkaede4444/ThoughtAnchor/releases/latest)

ThoughtAnchor es un tablero de ideas local para Windows y Android. Guarda fragmentos, organiza tarjetas, dibuja, conecta grupos reutilizables y compón un artículo a partir de tus palabras originales. Comparte papel cálido, acuarela y tipografía con serifas entre dispositivos.

Empecé ThoughtAnchor para ayudarme a mí y a las personas con TDAH a organizar pensamientos dispersos con menos esfuerzo. Guarda una idea cuando aparezca y conecta los fragmentos cuando tengas energía. El objetivo es gastar menos paciencia en ordenar, dedicar más atención a las ideas y facilitar la entrada en el estado de flujo. Captura primero, reutiliza tus palabras y deshaz libremente, a tu propio ritmo.

Este proyecto fue **construido íntegramente por Codex**, siguiendo los requisitos y la dirección del responsable: implementación, interfaz, pruebas, documentación y empaquetado. Los componentes de terceros mantienen sus licencias. La [licencia MIT](../../LICENSE) permite usar, modificar, redistribuir y utilizar comercialmente el proyecto sin autorización previa. Conserva los avisos de derechos de autor y licencia. El programa se ofrece tal cual, sin garantías.

## Instalación y uso

- Windows 10/11 x64: instalador, EXE portátil o ZIP. Tras extraer el ZIP, ejecuta `ThoughtAnchor.exe`. Requiere WebView2 Runtime y .NET Framework 4.8. Cerrar la ventana deja la aplicación en la bandeja; sal desde su menú. Los archivos Windows no tienen firma de código.
- Android 8.0 o posterior: instala el APK y actualiza el WebView del sistema. Los teléfonos usan la interfaz móvil y las tabletas la disposición de escritorio. Puedes cambiarla por dispositivo en Ajustes. Se ofrecen paquetes para Windows y Android.
- Compara el hash SHA-256 de la descarga con `SHA256SUMS.txt` de la publicación.

En la bandeja de entrada, Intro guarda y Mayús+Intro añade una línea. En Windows, `Ctrl+Shift+Space` abre la captura rápida mientras la aplicación está activa. Arrastra tarjetas al tablero, conecta sus cuatro puntos y agrúpalas. Haz doble clic en el texto para editarlo. Añade las tarjetas/grupos seleccionados al artículo y cambia el orden.

Mover, seleccionar, lápiz y borrador recuerdan la herramienta anterior. Un doble clic o doble toque en el tablero vuelve a ella; otro vuelve a la actual. Deshacer/rehacer en Windows: `Ctrl+Z` / `Ctrl+Y`. El editor de dibujo de una tarjeta conserva todo su texto, deja espacio debajo y permite ajustar ancho/alto. Guardar aplica dibujo y tamaño juntos; Cancelar descarta ambos. Dibujar directamente sobre tarjetas está **desactivado por defecto**; al activarlo, cada trazo se guarda automáticamente.

En el teléfono, desliza a la derecha o pulsa el botón de navegación para abrir el panel lateral; Ajustes está abajo. La sincronización LAN necesita una red común accesible y Windows en ejecución. Escanea o pega su código de vinculación en Android. Los conflictos sin conexión conservan ambos tableros. Las claves y opciones propias del dispositivo permanecen locales. Exporta tableros en `.thoughtanchor`, o artículos/borradores en Markdown o texto. Importar crea una copia. Haz copias periódicas; el historial de deshacer dura una sesión.

## IA opcional y privacidad

El tablero no necesita clave. Ajustes incluye GLM, Kimi, Qwen, MiMo, MiniMax, Grok, Tencent Hunyuan y los proveedores existentes. Elige proveedor, URL base, modelo disponible y su clave. Consulta regiones y opciones JSON en la [guía API](../providers.md). Ensamblar conserva los fragmentos exactos; pulir crea un borrador independiente. Los resultados son vistas previas hasta que los adoptes y no sobrescriben tarjetas.

Solo una acción IA explícita envía el artículo/borrador actual necesario. Las claves se cifran con DPAPI o Android Keystore y no se exportan ni sincronizan. No hay telemetría ni sincronización cloud alojada. Los archivos exportados son legibles. [Seguridad](../../SECURITY.md) · [Límites de verificación](../verification.md). No se probaron llamadas de pago a los proveedores.

## Desarrollo

Node.js 24 LTS; Windows requiere el entorno anterior. Android necesita JDK 21 y SDK 36; consulta la [guía Android](../android-runtime.md).

```sh
npm ci
npm test
npm run security
npm run package
npm run build:android
```

Resultados en `release/`. Conserva la clave privada de firma Android para futuras actualizaciones y nunca la añadas al repositorio. Regresiones con datos aislados: `npm run test:native` / `npm run test:android`. [Arquitectura](../native-runtime.md) · [Licencias de terceros](../third-party-notices.md).
