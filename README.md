# CARPETA GIT_REPONSIVE — Respaldo completo

Este repositorio es un **respaldo integro** de la carpeta local `CARPETA GIT_REPONSIVE`, realizado antes de formatear el equipo. Contiene varios mini-proyectos y plantillas web/scripts independientes entre sí, archivados tal cual estaban en disco (incluyendo `node_modules`, entornos virtuales, bases de datos locales y archivos de sesión). No es un único proyecto: es un archivo histórico de trabajos sueltos.

Fecha del respaldo: 29 de octubre de 2026.

## Indice de contenidos

- [PYTHON](#python) — Notebooks y ejercicios del curso de Python
- [SISTEMA_HOTEL](#sistema_hotel) — Dashboard de gestion hotelera (HTML/CSS/JS)
- [VISIT-LADING](#visit-lading) — Landing page inmobiliaria "INMOBILIARIAS ABC"
- [bot-whatsapp](#bot-whatsapp) — Bots de WhatsApp (Node.js + Baileys), tres variantes
- [localizador](#localizador) — Pagina single-file "Sistema de Localizacion Avanzado"

---

## PYTHON

Carpeta de practica/aprendizaje de Python (curso).

Contenido:
- `primerclase.ipynb` — Notebook de la primera clase del curso (variables, entrada/salida basica).
- `segundaclase.ipynb` — Notebook de la segunda clase del curso (incluye ejemplos con usuarios/contraseñas, probablemente relacionado con `usuarios.db`).
- `archivo.csv` — Archivo de datos de ejemplo usado en los ejercicios.
- `escuela.db`, `productos.db`, `usuarios.db` — Bases de datos SQLite de ejemplo usadas en los ejercicios de los notebooks.
- `.venv/` — Entorno virtual de Python ya creado (incluye `pyvenv.cfg`, `Scripts/`, `Lib/site-packages`, etc.). Se conserva tal cual para referencia, pero esta atado a la ruta original del equipo.

### Como retomarlo

Los notebooks requieren Jupyter. El entorno virtual incluido (`.venv`) fue creado en esta misma maquina y probablemente no sea reutilizable directamente en otro equipo (rutas absolutas de Windows), por lo que se recomienda crear uno nuevo:

```bash
cd PYTHON
python -m venv .venv
# Activar en Windows:
.venv\Scripts\activate
pip install notebook
jupyter notebook
```

Luego abrir `primerclase.ipynb` o `segundaclase.ipynb` desde la interfaz de Jupyter. Las bases `.db` se pueden inspeccionar con cualquier cliente SQLite (por ejemplo `sqlite3 usuarios.db`).

---

## SISTEMA_HOTEL

Plantilla de **dashboard interactivo** para control/gestion de un hotel. Es un proyecto puramente front-end (HTML + CSS + JS), sin backend ni dependencias de paquetes.

Contenido:
- `index.html` — Pagina principal del dashboard (titulo: "Dashboard Interactivo - Control Hotel").
- `css/hotel_dashboard.css` — Estilos del dashboard.
- `js/hotel_dashboard.js` — Logica/interactividad del dashboard (manejo de datos, vistas, etc., en JavaScript plano).

### Como retomarlo

No requiere instalacion. Basta abrir `SISTEMA_HOTEL/index.html` directamente en un navegador, o servirlo con cualquier servidor estatico, por ejemplo:

```bash
cd SISTEMA_HOTEL
npx serve .
```

---

## VISIT-LADING

Landing page de bienes raices para "**INMOBILIARIAS ABC**" (titulo de la pagina: "Tu hogar soñado te espera"). Proyecto front-end estatico, sin dependencias de paquetes.

Contenido:
- `index.html` — Pagina principal de la landing (navbar, secciones "Inicio", "Propiedades", etc.).
- `CSS/visit_element.css` — Estilos principales del sitio.
- `CSS/responsive.css` — Ajustes de responsividad (de ahi el nombre "RESPONSIVE" de la carpeta contenedora).
- `JS/visit_element.js` — Interactividad de la landing (menu, animaciones, etc.).
- `Complement_Radius/` — Carpeta vacia (sin archivos al momento del respaldo).
- `PHP_Desktop/` — Carpeta vacia (sin archivos al momento del respaldo); el nombre sugiere que estaba planeada una version con backend PHP que no llego a desarrollarse.

### Como retomarlo

No requiere instalacion. Basta abrir `VISIT-LADING/index.html` en un navegador o servirlo estaticamente:

```bash
cd VISIT-LADING
npx serve .
```

---

## bot-whatsapp

Carpeta con **tres variantes/iteraciones** de un bot de WhatsApp construido en Node.js sobre la libreria [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) (API no oficial de WhatsApp Web), con `pino` para logging y `qrcode-terminal` para mostrar el QR de vinculacion en consola.

Contenido (raiz de `bot-whatsapp`):
- `bot.js` — Codigo principal del bot (manejo de mensajes, conversaciones, respuestas automaticas).
- `package.json` / `package-lock.json` — Dependencias Node.js (`@whiskeysockets/baileys`, `pino`, `qrcode-terminal`).
- `conversaciones.json`, `respondidos.json` — Datos/registro generados en tiempo de ejecucion (historial de conversaciones y mensajes ya respondidos).
- `node_modules/` — Dependencias ya instaladas (~47 MB).
- `auth_info/` — **Credenciales de sesion de WhatsApp** generadas por Baileys al vincular el bot con un numero real (incluye `creds.json` y claves de sincronizacion de estado). Ver advertencia de seguridad abajo.
- `backups/`, `logs/` — Carpetas de respaldo y logs (vacias al momento del respaldo).

Subcarpetas con variantes del mismo bot:
- `WhatsAppBot/` — Otra copia del bot (mismo `bot.js`, mismo `package.json`), con su propia carpeta `node_modules/`, `auth_info/`, `backups/`, `logs/`, `conversaciones.json` y `respondidos.json`. Parece ser una copia de trabajo o version alterna de la carpeta raiz.
- `mi-bot-whatsapp/` — Solo contiene `package.json`, `package-lock.json` y `node_modules/` (sin `bot.js` ni carpeta de autenticacion); parece ser un scaffold/instalacion base sin codigo propio todavia, o una version donde el codigo se perdio/no se guardo.

### Advertencia de seguridad importante

Las carpetas `auth_info/` (en la raiz y en `WhatsAppBot/`) contienen **credenciales reales de sesion de WhatsApp** (`creds.json`, claves `app-state-sync-key-*.json`, etc.) generadas al escanear el QR con un numero de telefono real. Estas credenciales, si siguen activas, permiten controlar esa sesion de WhatsApp. Como este repositorio es **publico**, quien tenga el enlace podria ver esos archivos. Se recomienda:
1. Cerrar/revocar esa sesion de WhatsApp Web desde el telefono vinculado (Ajustes > Dispositivos vinculados) lo antes posible.
2. Si se desea seguir usando el bot en el futuro, generar una vinculacion nueva (nuevo QR) una vez cerrada la sesion anterior.

### Como retomarlo

Para cualquiera de las tres carpetas (`bot-whatsapp/`, `bot-whatsapp/WhatsAppBot/` o `bot-whatsapp/mi-bot-whatsapp/`):

```bash
cd bot-whatsapp   # o bot-whatsapp/WhatsAppBot
npm install       # node_modules ya viene incluido, pero se recomienda reinstalar en el equipo nuevo
node bot.js       # (en mi-bot-whatsapp no existe bot.js: habria que recuperarlo o escribirlo de nuevo)
```

Al ejecutar `bot.js` por primera vez en un equipo nuevo (o tras revocar la sesion anterior), Baileys mostrara un codigo QR en la terminal para vincular un numero de WhatsApp.

---

## localizador

Pagina unica (single-file) llamada "**Sistema de Localizacion Avanzado**": HTML con CSS y posiblemente JS embebidos en el mismo archivo (tema visual oscuro estilo "terminal/hacker", con fondo animado). Proyecto de demostracion/plantilla visual, sin dependencias de paquetes.

Contenido:
- `index.html` — Pagina completa (incluye estilos embebidos).

### Como retomarlo

No requiere instalacion. Basta abrir `localizador/index.html` en un navegador o servirlo estaticamente:

```bash
cd localizador
npx serve .
```

---

## Notas generales del respaldo

- Se eliminaron carpetas `.git` internas si existian en algun subproyecto, para integrar todo como archivos normales de este repositorio unico (en la revision realizada al momento del respaldo no se encontro ninguna carpeta `.git` anidada).
- No se excluyo ningun archivo por tamaño: ningun archivo individual supero los 100 MB.
- El tamaño aproximado del contenido respaldado es de unos 160 MB (~9700 archivos), principalmente por las carpetas `node_modules` de los bots de WhatsApp y el entorno virtual de Python.
- Este respaldo se subio tal cual estaba en disco, incluyendo archivos generados (dependencias, bases de datos locales, logs, credenciales de sesion), para preservar el contenido completo antes del formateo del equipo.
