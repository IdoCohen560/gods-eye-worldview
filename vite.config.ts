import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 3000,
    proxy: {
      // OpenSky Network — aircraft ADS-B
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, '/api/states/all'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'godseye-react/1.0');
            // Auth: Basic or Anonymous
            const user = process.env.OPENSKY_USERNAME;
            const pass = process.env.OPENSKY_PASSWORD;
            if (user && pass) {
              proxyReq.setHeader('Authorization', 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'));
            }
          });
        },
      },
      // CelesTrak — satellite TLEs
      '/api/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => {
          const group = path.split('/').pop() || 'starlink';
          return `/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'godseye-react/1.0 contact:admin@godseye.app');
          });
        },
      },
      // NASA FIRMS — active fires
      '/api/firms': {
        target: 'https://firms.modaps.eosdis.nasa.gov',
        changeOrigin: true,
        rewrite: () => {
          const key = process.env.FIRMS_MAP_KEY || '';
          return `/api/area/csv/${key}/VIIRS_SNPP_NRT/world/2`;
        },
      },
      // Overpass API — military, traffic, OSM data
      '/api/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: () => '/api/interpreter',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('User-Agent', 'godseye-react/1.0');
            // Forward body for POST requests
            if (req.method === 'POST') {
              proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
          });
        },
      },
      // GBFS — bikeshare stations (allowlisted hosts)
      '/api/gbfs': {
        target: 'https://gbfs.citibikenyc.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract and decode the upstream URL from the path
          const encoded = path.replace(/^\/api\/gbfs\//, '');
          try {
            return '/' + decodeURIComponent(encoded);
          } catch {
            return '/gbfs/en/station_information.json';
          }
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'godseye-react/1.0');
          });
        },
      },
      // TomTom — traffic flow tiles
      '/api/tomtom': {
        target: 'https://api.tomtom.com',
        changeOrigin: true,
        rewrite: (path) => {
          const key = process.env.TOMTOM_API_KEY || '';
          const rest = path.replace(/^\/api\/tomtom/, '');
          return `${rest}?key=${key}`;
        },
      },
      // Open-Meteo — weather
      '/api/weather': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/weather/, '/v1/forecast'),
      },
      // Launch Library 2 — rocket launches
      '/api/launches': {
        target: 'https://ll.thespacedevs.com',
        changeOrigin: true,
        rewrite: () => '/2.2.0/launches/upcoming/?limit=20&window_days=30&format=json',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'godseye-react/1.0');
          });
        },
      },
    },
  },
});
