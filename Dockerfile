# The application relies on Vite's Node middleware for its same-origin API
# proxies (OpenAI, OpenSky, AIS, CCTV, etc.), so it must run as a persistent
# Node service rather than a static-only Vite build.
FROM node:26-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

ENV HOST=0.0.0.0
ENV PORT=4173

EXPOSE 4173

# Vite's serve mode owns the complete API middleware layer used by the app.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
