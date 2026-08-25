/**
 * useVoiceControl — hook for OpenAI Realtime voice commands.
 * Adapted from reference repo's gevRealtime.js + gevActions.js (simplified).
 * 
 * Uses WebRTC to connect to OpenAI Realtime API.
 * Handles: layer toggles, camera fly-to, style changes, entity queries.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import * as Cesium from 'cesium';
import type { ShaderMode } from '../App';

const TOKEN_URL = '/api/realtime/token';
const REALTIME_URL = 'https://api.openai.com/v1/realtime/calls';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'executing' | 'error';

interface Props {
  viewer: Cesium.Viewer | null;
  activeLayers: Record<string, boolean>;
  onToggleLayer: (layer: string) => void;
  onSetStyle: (style: ShaderMode) => void;
}

const LAYER_ALIASES: Record<string, string> = {
  flights: 'aircraft', planes: 'aircraft', aircraft: 'aircraft',
  military: 'military', satellites: 'satellites',
  earthquakes: 'earthquakes', quakes: 'earthquakes',
  traffic: 'traffic', cctv: 'cctv', cameras: 'cctv',
  radio: 'radio', ships: 'ships', vessels: 'ships', ais: 'ships',
  bikeshare: 'bikeshare', bikes: 'bikeshare',
  datacenters: 'datacenters', dams: 'dams',
  fires: 'fires', firms: 'fires',
  rockets: 'rockets', launches: 'rockets',
};

const STYLE_ALIASES: Record<string, ShaderMode> = {
  normal: 'normal', retro: 'normal', nv: 'nvg', nvg: 'nvg',
  night: 'nvg', flir: 'flir', thermal: 'flir', infrared: 'flir',
  crt: 'crt', scanlines: 'crt', cel: 'cel', cartoon: 'cel',
  classified: 'classified', bw: 'bw', blackwhite: 'bw', noir: 'noir',
  snow: 'snow', surveillance: 'surveillance',
};

export function useVoiceControl({ viewer, activeLayers, onToggleLayer, onSetStyle }: Props) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string>('');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef<string>('');

  const stop = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    pcRef.current = null;
    dcRef.current = null;
    setStatus('idle');
  }, []);

  const executeToolCall = useCallback(async (callId: string, name: string, args: Record<string, any>) => {
    if (!viewer) return;
    setStatus('executing');
    let result: any = {};

    try {
      switch (name) {
        case 'set_layer_visibility': {
          const layerId = LAYER_ALIASES[args.layerId] || args.layerId;
          if (args.enabled !== undefined && args.enabled !== activeLayers[layerId]) {
            onToggleLayer(layerId);
          }
          result = { ok: true, layerId, enabled: args.enabled ?? !activeLayers[layerId] };
          break;
        }
        case 'fly_to_location': {
          let lat = args.latitude, lon = args.longitude;
          if (args.query) {
            // Simple city lookup
            const cities: Record<string, [number, number]> = {
              'new york': [40.71, -74.01], 'nyc': [40.71, -74.01],
              'san francisco': [37.77, -122.42], 'sf': [37.77, -122.42],
              'london': [51.51, -0.13], 'tokyo': [35.68, 139.65],
              'paris': [48.86, 2.35], 'sydney': [-33.87, 151.21],
            };
            const q = args.query.toLowerCase();
            for (const [key, coords] of Object.entries(cities)) {
              if (q.includes(key)) { [lat, lon] = coords; break; }
            }
          }
          if (lat && lon) {
            const alt = args.rangeM || 2_000_000;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
              duration: 3,
            });
          }
          result = { ok: true, lat, lon };
          break;
        }
        case 'set_visual_style': {
          const style = STYLE_ALIASES[args.style] || args.style;
          if (style) onSetStyle(style as ShaderMode);
          result = { ok: true, style };
          break;
        }
        case 'zoom_to_globe': {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 20, 15_000_000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-65), roll: 0 },
            duration: 3,
          });
          result = { ok: true };
          break;
        }
        case 'get_current_view_state': {
          const c = viewer.camera.positionCartographic;
          result = {
            ok: true,
            latitude: Cesium.Math.toDegrees(c.latitude),
            longitude: Cesium.Math.toDegrees(c.longitude),
            altitude: c.height,
            activeLayers: Object.entries(activeLayers).filter(([, v]) => v).map(([k]) => k),
          };
          break;
        }
        default:
          result = { ok: false, error: `Unknown action: ${name}` };
      }
    } catch (e: any) {
      result = { ok: false, error: e.message };
    }

    // Send result back
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      }));
    }
    setStatus('listening');
  }, [viewer, activeLayers, onToggleLayer, onSetStyle]);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'response.function_call_arguments.done') {
        const { call_id, name, arguments: argsStr } = msg;
        const args = JSON.parse(argsStr || '{}');
        await executeToolCall(call_id, name, args);
      } else if (msg.type === 'error') {
        setError(msg.error?.message || 'Voice error');
      }
    } catch (e: any) {
      // Non-JSON messages are fine
    }
  }, [executeToolCall]);

  const start = useCallback(async (opts?: { pushToTalk?: boolean }) => {
    try {
      setStatus('connecting');
      setError('');

      // Get ephemeral token
      const tokenRes = await fetch(TOKEN_URL);
      if (!tokenRes.ok) throw new Error('Failed to get voice token');
      const { client_secret } = await tokenRes.json();
      tokenRef.current = client_secret;

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add audio tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = handleMessage;
      dc.onopen = () => setStatus('listening');
      dc.onclose = () => setStatus('idle');

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send to OpenAI
      const answerRes = await fetch(REALTIME_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client_secret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!answerRes.ok) throw new Error('Failed to establish voice connection');
      const answerSdp = await answerRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // Set up audio playback
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
      };

      // Send session config with tool definitions
      setTimeout(() => {
        if (dc.readyState === 'open') {
          dc.send(JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are a global intelligence assistant. Help users navigate the map, toggle data layers, change visual styles, and query entity data. Be concise.',
              tools: [
                { type: 'function', name: 'set_layer_visibility', description: 'Toggle a data layer on/off', parameters: { type: 'object', properties: { layerId: { type: 'string' }, enabled: { type: 'boolean' } }, required: ['layerId'] } },
                { type: 'function', name: 'fly_to_location', description: 'Fly camera to a location', parameters: { type: 'object', properties: { query: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' }, rangeM: { type: 'number' } } } },
                { type: 'function', name: 'set_visual_style', description: 'Change the visual style/shader', parameters: { type: 'object', properties: { style: { type: 'string', enum: ['normal', 'nvg', 'flir', 'crt', 'cel', 'classified', 'bw', 'surveillance', 'noir', 'snow'] } }, required: ['style'] } },
                { type: 'function', name: 'zoom_to_globe', description: 'Pull back to global view', parameters: { type: 'object', properties: {} } },
                { type: 'function', name: 'get_current_view_state', description: 'Get current camera and layer state', parameters: { type: 'object', properties: {} } },
              ],
              turn_detection: { type: 'server_vad', threshold: 0.5 },
            },
          }));
        }
      }, 500);

    } catch (e: any) {
      setStatus('error');
      setError(e.message);
    }
  }, [handleMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const sendTextCommand = useCallback((text: string) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      }));
      dcRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  return {
    status,
    error,
    start,
    stop,
    sendTextCommand,
    isActive: () => status === 'listening' || status === 'executing',
  };
}
