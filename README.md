<div align="center">

# GOD'S EYE

**A real-time 3D globe that overlays live aircraft, satellites, ships, wildfires, earthquakes, and armed-conflict feeds onto one CesiumJS map** — a browser-based open-source-intelligence dashboard styled like a surveillance terminal.

![CesiumJS](https://img.shields.io/badge/CesiumJS-3D%20globe-48B?style=flat-square)
![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Deploy](https://img.shields.io/badge/deploy-Netlify%20Functions-00C7B7?style=flat-square&logo=netlify&logoColor=white)

</div>

---

GOD'S EYE pulls from a dozen public data sources and renders them together on a single interactive 3D Earth. Toggle layers on and off from the sidebar to watch live air traffic, orbiting satellites, ship positions, active fires, recent earthquakes, natural-hazard events, and reported conflicts move across the globe in near real time. It is built for anyone who wants a hands-on OSINT sandbox — analysts, hobbyists, and developers exploring what open geospatial feeds can do when you stack them.

The interface leans into a military-HUD aesthetic: a boot sequence, a heads-up display of coordinates and live feed counts, a command bar for jumping to locations, bounding-box detection overlays on tracked entities, and a set of full-screen GLSL post-processing shaders (night vision, FLIR/thermal, CRT scanlines, cel shading, "classified" redaction, black-and-white, and a surveillance look).

## Live data feeds

| Layer | Source |
|-------|--------|
| Aircraft | OpenSky Network |
| Satellites | CelesTrak TLEs, propagated in-browser with `satellite.js` |
| Ships (AIS) | AISStream (WebSocket relay) |
| Wildfires | NASA FIRMS |
| Earthquakes | USGS |
| Armed conflict | ACLED, with GDELT Events 2.0 as a fallback |
| Natural events | NASA EONET |
| Disasters | GDACS |
| Weather alerts | NWS (weather.gov) |
| Road traffic | TomTom Traffic Flow tiles |
| Webcams / CCTV | Windy |
| Basemap imagery | NASA GIBS layers, Cesium Ion terrain |

Each feed is polled or streamed on its own interval and cached, so layers update independently without hammering the upstream APIs.

## How it works

The app is a two-part system:

- **Frontend** — a React + CesiumJS single-page app. `CesiumViewer` owns the globe; per-feed React hooks (`useAircraftFeed`, `useSatelliteFeed`, …) fetch data and hand entities to Cesium primitives. `DeadReckoning` interpolates aircraft and ship positions between polls so movement stays smooth, and `PrimitiveManager` batches entity rendering.
- **Backend proxy** — an Express server (`server/`) for local dev and equivalent **Netlify Functions** (`netlify/functions/`) for production. Both exist to keep API keys server-side and to smooth over CORS and auth (e.g. OpenSky and ACLED OAuth token exchange). The frontend auto-detects which backend it's talking to via `VITE_API_BASE`.

## Quickstart

```bash
npm install
cp .env.example .env      # then fill in your API keys/tokens
npm run dev:full          # Vite frontend (:3000) + Express proxy (:3001)
```

- `npm run dev` — frontend only
- `npm run dev:server` — backend proxy only
- `npm run dev:full` — both together
- `npm run build` — type-check and build for production

### Environment

Copy `.env.example` and supply the keys you have — feeds you don't configure simply stay empty:

```
VITE_CESIUM_ION_TOKEN=      # required for terrain / basemap
VITE_GOOGLE_MAPS_API_KEY=
OPENSKY_USERNAME=
OPENSKY_PASSWORD=
```

Additional optional keys (ACLED, NASA FIRMS, AISStream, TomTom) are read by the backend proxy; see `src/config/constants.ts` for the full list.

## Tech stack

CesiumJS + Resium · React 18 · TypeScript · Vite 6 · `satellite.js` · Express 5 · Netlify Functions · custom GLSL post-processing shaders.

## Project structure

```
src/
  components/   CesiumViewer, HUD, CommandBar, Sidebar, ShaderSelector, BootSequence…
  feeds/        one client per data source (AircraftFeed, SatelliteFeed, ShipFeed…)
  hooks/        React hooks wiring each feed into the viewer
  shaders/      GLSL post-processing modes (NVG, FLIR, CRT, cel, classified…)
  layers/       GIBS imagery + TomTom traffic layer managers
  utils/        DeadReckoning, PrimitiveManager
server/         Express proxy (routes/ + _shared/ auth helpers)
netlify/        production equivalents as serverless functions
```

<div align="center">

Built by [IdoCohen560](https://github.com/IdoCohen560).

</div>
