import { AISSTREAM_API_KEY } from '../config/constants';

export interface Ship {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  speedOverGround: number;
  courseOverGround: number;
  shipType: number;
}

export function getShipCategory(type: number): string {
  if (type >= 60 && type <= 69) return 'passenger';
  if (type >= 70 && type <= 79) return 'cargo';
  if (type >= 80 && type <= 89) return 'tanker';
  if (type >= 35 && type <= 39) return 'military';
  return 'other';
}

export function getShipColor(type: number): string {
  const cat = getShipCategory(type);
  switch (cat) {
    case 'passenger': return '#ffffff';
    case 'cargo': return '#888888';
    case 'tanker': return '#ff6b00';
    case 'military': return '#ff2d2d';
    default: return '#4488ff';
  }
}

type ShipCallback = (ships: Map<string, Ship>) => void;

let ws: WebSocket | null = null;
let shipMap = new Map<string, Ship>();

export function connectShipFeed(
  bounds: { south: number; west: number; north: number; east: number },
  onUpdate: ShipCallback,
): () => void {
  if (!AISSTREAM_API_KEY) return () => {};

  // Close existing
  if (ws) { ws.close(); ws = null; }
  shipMap = new Map();

  ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.onopen = () => {
    ws?.send(JSON.stringify({
      APIKey: AISSTREAM_API_KEY,
      BoundingBoxes: [[
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ]],
    }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.MessageType === 'PositionReport') {
        const pos = msg.Message?.PositionReport;
        const meta = msg.MetaData;
        if (!pos || !meta) return;

        const ship: Ship = {
          mmsi: String(meta.MMSI || ''),
          name: meta.ShipName?.trim() || `MMSI:${meta.MMSI}`,
          latitude: pos.Latitude,
          longitude: pos.Longitude,
          speedOverGround: pos.Sog || 0,
          courseOverGround: pos.Cog || 0,
          shipType: meta.ShipType || 0,
        };

        if (ship.latitude !== 0 && ship.longitude !== 0) {
          shipMap.set(ship.mmsi, ship);
        }

        // Throttle UI updates — only push every 50 messages
        if (shipMap.size % 50 === 0 || shipMap.size < 10) {
          onUpdate(new Map(shipMap));
        }
      }
    } catch { /* ignore parse errors */ }
  };

  ws.onerror = (err) => console.error('AISStream error:', err);
  ws.onclose = () => { ws = null; };

  // Periodic flush
  const flushInterval = setInterval(() => {
    if (shipMap.size > 0) onUpdate(new Map(shipMap));
  }, 5000);

  return () => {
    clearInterval(flushInterval);
    if (ws) { ws.close(); ws = null; }
    shipMap.clear();
  };
}
