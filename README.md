# DSP2.0 — contactos propios cifrados

Funcionalidad integrada en `main`, publicada en GitHub Pages.

## Funcionamiento
- Busca nombres en la API y en la lista propia. Acentos ignorados; varios nombres separados por salto de línea, coma o punto y coma.
- Combina resultados sin columna de origen. Deduplica por nombre normalizado, teléfono y dirección: números diferentes se conservan.
- Una fuente puede fallar sin ocultar los resultados de la otra. Timeout de API: 15 segundos; lista: 12 segundos.
- La lista remota se descarga al buscar, al volver a la app, al desbloquear y con Actualizar contactos. Si falla la red, usa la última copia cifrada validada. No es sincronización continua en segundo plano.

## Web: agregar
1. `npm ci`, `npm run dev`, abrir `/agregar/` (en producción se compila como entrada separada).
2. Ingresar el mismo token de la API. No se compila ni guarda ese token en la web.
3. Cargar la lista publicada, importar una copia cifrada o crear la primera lista si todavía no existe.
4. Agregar nombre, teléfono, dirección, ciudad y provincia. También permite eliminar registros.
5. Descargar `contacts.enc.json` y subirlo a `public/data/contacts.enc.json` **en main**. El enlace del editor apunta a main.
6. Esperar la caché de GitHub Raw y actualizar contactos en la app. No es necesario reinstalar para cambios de datos.

No se incluye una lista inicial ni datos personales. Hasta subir la primera lista, la API sigue funcionando y se avisa que la lista propia no está disponible. El formulario no escribe directamente en GitHub. No subir archivos con contactos sin cifrar. Antes de editar, cargar la versión más reciente; Git no resuelve automáticamente dos ediciones simultáneas del archivo cifrado.

## Cifrado y token
AES-256-GCM con IV aleatorio de 12 bytes, salt de 16 bytes y clave derivada con PBKDF2-SHA256 (600 000 iteraciones). Token y datos descifrados solo permanecen en memoria en la web. La caché en localStorage contiene exclusivamente el sobre cifrado. Se elimina el antiguo token en texto claro de localStorage al iniciar.

En Android, el token se introduce una vez y se guarda cifrado con una clave de Android Keystore. No está incluido en el APK ni en el repositorio. Se puede borrar con Olvidar token. La copia cifrada permanece para poder desbloquearla después. No protege contra un dispositivo comprometido o alguien que ya conozca el token. Quien tenga un APK antiguo con el token incorporado podría extraerlo y descifrar la lista: usar un token nuevo para privacidad frente a esos destinatarios.

Para rotar token: importar o cargar con el anterior, cambiar el campo al nuevo y descargar/publicar otra vez. Actualizar el token en Android. Los archivos antiguos del historial siguen cifrados con el token anterior.

## Android
Node 22+, JDK 21 y SDK 36. `npm ci`, `npm run android:sync`, `cd android`, `gradlew.bat assembleDebug` en Windows (`./gradlew assembleDebug` en Linux).

Primera instalación de esta versión requerida para activar la función. Después los contactos se actualizan desde GitHub. La app no permite agregar contactos; usar la web. No se ha probado Android Keystore en un teléfono real en esta sesión.

## Configuración
`VITE_API_BASE_URL` configura la API. `VITE_CONTACTS_URL` configura la URL HTTPS del JSON cifrado. Por defecto apunta al archivo de main en GitHub Raw (también desde el APK). Nunca usar `VITE_API_TOKEN`: esta rama no lo lee.

## Verificación
`npm test` cubre cifrado, token incorrecto, alteración, caché sin conexión, fallos independientes de fuentes, búsqueda y deduplicación. `npm run build` compila ambas páginas. Los cambios en main se publican mediante GitHub Actions.
