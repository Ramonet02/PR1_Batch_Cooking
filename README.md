# Batch Cook

> **UOC · PR1 · Desarrollo de aplicaciones interactivas**
> Aplicación móvil de organización semanal de tuppers para llevar al trabajo.
> Stack: **Capacitor · ViteJS · p5.js · Vanilla JS**.

---

## 📱 Cómo evaluar el proyecto (Android Studio)

Este es el flujo exacto que indica el enunciado de la PR1. La entrega no
incluye `node_modules/`, `www/` ni `dist/`, así que el primer paso es
restaurar las dependencias.

### Pre-requisitos

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
- **JDK 17+** (Android Studio lo trae)
- Un dispositivo Android con depuración USB activada o un emulador (AVD)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Generar el bundle web de producción
npm run build

# 3. Sincronizar el bundle con el proyecto nativo Android
npx cap sync android

# 4. Abrir el proyecto en Android Studio
npx cap open android
```

Una vez abierto Android Studio, pulsa **Run ▶** y selecciona tu dispositivo
o emulador. La primera compilación tarda — Gradle descarga el SDK.

### Dispositivo y versión Android utilizados en las pruebas

> **Nothing Phone CMF Phone 1 · Android 14 (Nothing OS 2.0)**

---

## 🎯 Requisitos del enunciado y dónde se cumplen

| Requisito | Estado | Implementación |
|---|---|---|
| Proyecto creado con Capacitor + Vite + compilado con Android Studio | ✅ | `capacitor.config.json`, `vite.config.js`, carpeta `android/`, scripts en `package.json` |
| Canvas con gráficos / animaciones generativas ligadas a la App (p5.js) | ✅ | 4 canvas p5: donut nutricional, bubbles de cocinas, línea de coste histórico, timers circulares del Modo Batch — todos suscritos al estado y se redibujan al mutar |
| Interacción con funcionalidad nativa del dispositivo | ✅ | 5 plugins: **Haptics**, **Camera**, **Motion** (shake), **Local Notifications**, **Preferences** |
| Almacenamiento local de datos | ✅ | `@capacitor/preferences` en device + fallback a `localStorage` en navegador (`src/storage.js`) |
| Calidad del código: comentarios, claridad, buenas prácticas | ✅ | JSDoc en cada archivo, estado centralizado con mutadores/selectors, separación por capas (state · screens · canvas · native · storage) |

---

## ✨ Funcionalidades

| Pantalla | Funcionalidad |
|---|---|
| **Welcoming** | Onboarding de 4 diapositivas la primera vez (`public/welcoming/`) con indicadores y flecha → / botón "Empezar". Persiste el flag en Preferences. |
| **Home (Inicio)** | Saludo personalizado, selector de día L–V, tarjeta del día con foto (cámara), 3 canvas p5 (balance nutricional · tipos de cocina · coste histórico), preview de la nevera. |
| **Modo Batch** | Ingredientes comunes a varias recetas, timers paralelos con canvas p5 circulares, haptics fuertes al terminar timer, notificación local programada. |
| **Recetario** | Filtros (nutricional · cocina · dificultad · tiempo), búsqueda, **✨ Sorpréndeme** con shake gesture (`@capacitor/motion`), badge "esta semana" en recetas planificadas. |
| **Detalle receta** | Hero tonal, chips, ingredientes con cantidades, pasos numerados, asignar a un día de la semana. |
| **Crear/Editar receta** | Formulario completo con selector de icono, chips de tipo/cocina/cantidad/dificultad, lista de ingredientes editable. |
| **Mi Nevera** | Inventario por caducidad o categoría, filtros, banner para los que caducan pronto. |
| **Lista de la Compra** | Generación automática a partir de las recetas planificadas, descontando lo que ya está en la nevera. Edición de precios, marcado de comprados, productos extra manuales, cálculo de coste medio por tupper. |

### Detalles de diseño extra

- **Props decorativos**: 16 ilustraciones temáticas en `public/props/` distribuidas por todas las pantallas como elementos de fondo (z-index 0, pointer-events: none, opacity 0.32). Sistema reutilizable vía `src/components/prop.js`.
- **Sistema de diseño "Organic Warmth"**: tokens en `src/styles/tokens.css`, filtros SVG `paint-edge` para bordes pintados a mano, tipografía Fraunces (display) + DM Sans (UI).

### Navegación inferior

```
[ ⚡ Batch ]   [ 🏠 Inicio ]   [ 📋 Recetas ]
```

---

## 🗂 Estructura del proyecto

```
PR1/
├── android/                       ← Proyecto nativo Android (Capacitor lo gestiona)
├── public/
│   ├── welcoming/                 ← 4 diapositivas onboarding
│   ├── props/                     ← 16 ilustraciones decorativas
│   └── tupper.png                 ← icono usuario
├── src/
│   ├── main.js                    ← Entry point: storage → hydrate → welcoming → router
│   ├── state.js                   ← Estado global + mutadores + selectors derivados
│   ├── storage.js                 ← Wrapper @capacitor/preferences + fallback localStorage
│   ├── router.js                  ← Hash-router minimalista con animaciones de slide
│   │
│   ├── api/
│   │   └── themealdb.js           ← Fetch de ~40 recetas TheMealDB (PR2 prep)
│   │
│   ├── styles/
│   │   ├── tokens.css             ← Variables CSS (colores, type, spacing, radii)
│   │   ├── base.css               ← Reset + tipografía + utilidades + ruido SVG
│   │   ├── components.css         ← Botones, chips, cards, inputs, weekbar, bnav, props
│   │   └── screens.css            ← Layouts específicos por pantalla + welcoming
│   │
│   ├── components/
│   │   ├── device-shell.js        ← Shell común: header + scroll + bottom-nav
│   │   ├── bottom-nav.js          ← Navegación inferior (3 tabs)
│   │   ├── subtabs.js             ← Sub-tabs Recetario/Nevera/Compra
│   │   ├── sheet.js               ← Bottom-sheet reutilizable (modales)
│   │   ├── icon.js                ← Iconos food + UI (Iconify)
│   │   └── prop.js                ← Props decorativos de fondo
│   │
│   ├── screens/
│   │   ├── welcoming.js           ← Onboarding primera vez
│   │   ├── home.js                ← Dashboard semanal + canvas + cámara
│   │   ├── batch.js               ← Modo Batch (timers + notifs)
│   │   ├── recetario.js           ← Listado con filtros + shake
│   │   ├── receta-detalle.js      ← Detalle + asignar a día
│   │   ├── receta-nueva.js        ← Form CREATE / EDIT
│   │   ├── nevera.js              ← Inventario por caducidad
│   │   └── compra.js              ← Lista compra + precios + extras
│   │
│   ├── canvas/
│   │   ├── home-stats.js          ← p5 sketches: donut + bubbles + línea coste
│   │   └── batch-timers.js        ← p5 sketches: timers circulares
│   │
│   └── native/
│       ├── haptics.js             ← Wrapper @capacitor/haptics
│       ├── camera.js              ← Wrapper @capacitor/camera + fallback navegador
│       ├── motion.js              ← Wrapper @capacitor/motion (shake gesture)
│       └── notifications.js       ← Wrapper @capacitor/local-notifications
│
├── index.html                     ← Entry HTML + filtros SVG paint-edge
├── vite.config.js                 ← base: './' (crítico para WebView Capacitor)
├── capacitor.config.json          ← appId, webDir, plugins config
├── package.json
└── README.md
```

---

## 💻 Modo desarrollo (navegador, sin Android Studio)

Para iterar rápido sin recompilar Android:

```bash
npm run dev
```

Abre <http://localhost:5173>. Los plugins nativos detectan el entorno
navegador y caen a fallbacks:

- `Camera` → `<input type="file" capture="environment">`
- `Haptics` → no-op
- `Motion` → API `DeviceMotionEvent` del navegador
- `Notifications` → `console.log`
- `Preferences` → `localStorage`

---

## ⚙️ Comandos disponibles

| Comando | Para qué |
|---|---|
| `npm install` | Instala dependencias (primer paso tras descomprimir) |
| `npm run dev` | Servidor de desarrollo en navegador con hot reload |
| `npm run build` | Bundle producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente (verifica el build antes de sync) |
| `npx cap sync android` | Copia el `dist/` al proyecto Android |
| `npx cap open android` | Abre Android Studio con el proyecto |
| `npm run cap:sync` | Atajo: `vite build && npx cap sync android` |
| `npm run android` | Atajo: `cap:sync` + `cap:open` (el del día a día) |

---

## 🔐 Permisos Android

Los permisos están declarados en
`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Android pedirá la confirmación al usuario la primera vez que se invoca cada
plugin (cámara, notificaciones).

---

## 📐 Documentación de diseño complementaria

- [`BATCH_COOK_DISENO.md`](BATCH_COOK_DISENO.md) — Arquitectura y decisiones
- [`DESIGN.md`](DESIGN.md) — Sistema de diseño "Organic Warmth"
- [`BATCH_COOK_DESIGN_SYSTEM.md`](BATCH_COOK_DESIGN_SYSTEM.md) — Spec de tokens
- [`CLAUDE_DESIGN_PROMPTS.md`](CLAUDE_DESIGN_PROMPTS.md) — Prompts de iteración de diseño

---

## 🐛 Troubleshooting

**`npm install` falla con error de versión de Node**
→ Necesitas Node 18+. Comprueba con `node -v`.

**Pantalla en blanco en el navegador**
→ Abre DevTools (F12), mira la consola. Lo más probable: import roto o error en un screen.

**"Plugin not implemented on android" al usar un plugin**
→ Ejecuta `npx cap sync android` después de cualquier cambio de dependencias.

**El build copia rutas absolutas y rompe en WebView**
→ Verifica que `vite.config.js` mantiene `base: './'`.

**No veo los cambios CSS/JS en el dispositivo**
→ Cambios en CSS/JS requieren `npm run cap:sync` y volver a pulsar Run en Android Studio.

**Volver a ver el welcoming**
→ En DevTools del navegador: `localStorage.removeItem('batchcook.welcoming.seen.v1')` y recarga. En device: desinstala y vuelve a instalar la app.

---

## 👤 Autor

**Ramón Pérez** — Estudiante UOC, Grado en Diseño y Creación Digitales.
Curso 2025–26 · Asignatura: Desarrollo de aplicaciones interactivas (3r año).
