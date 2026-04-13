import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { GOOGLE_MAPS_API_KEY, AIRCRAFT_POLL_INTERVAL, SATELLITE_UPDATE_INTERVAL } from '../config/constants';
import { applyShader, removeShader } from '../shaders/ShaderManager';
import { fetchAircraft, type AircraftState } from '../feeds/AircraftFeed';
import { fetchSatellites, propagateAll, type SatelliteRecord } from '../feeds/SatelliteFeed';
import { loadCameras, type Camera } from '../feeds/CCTVFeed';
import { createGIBSLayer, type GIBSLayerConfig } from '../layers/GIBSLayerManager';
import { GIBS_LAYERS } from '../config/gibs-layers';
import type { ShaderMode, ViewState } from '../App';

interface Props {
  onReady: (viewer: Cesium.Viewer) => void;
  shaderMode: ShaderMode;
  activeLayers: Record<string, boolean>;
  onViewStateChange: (state: ViewState) => void;
  onFeedCountsChange: (counts: { aircraft: number; satellites: number; cameras: number }) => void;
}

export default function CesiumViewer({ onReady, shaderMode, activeLayers, onViewStateChange, onFeedCountsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const prevShaderRef = useRef<ShaderMode>('normal');
  const aircraftEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const satelliteEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const cameraEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const satelliteDataRef = useRef<SatelliteRecord[]>([]);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      timeline: true,
      animation: true,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: true,
      fullscreenButton: false,
      selectionIndicator: true,
      infoBox: false,
    });

    // Add Google 3D Tiles if API key provided
    if (GOOGLE_MAPS_API_KEY) {
      Cesium.Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`,
        { showCreditsOnScreen: true }
      ).then(tileset => {
        viewer.scene.primitives.add(tileset);
      }).catch(err => {
        console.warn('Google 3D Tiles unavailable, using default globe:', err);
      });
    }

    // Enable lighting for day/night
    viewer.scene.globe.enableLighting = true;

    // Camera change listener for HUD
    viewer.camera.changed.addEventListener(() => {
      const cart = viewer.camera.positionCartographic;
      onViewStateChange({
        lat: Cesium.Math.toDegrees(cart.latitude),
        lon: Cesium.Math.toDegrees(cart.longitude),
        alt: cart.height,
        heading: Cesium.Math.toDegrees(viewer.camera.heading),
      });
    });

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        const entity = picked.id as Cesium.Entity;
        const props = entity.properties;
        if (props?.feedType?.getValue(viewer.clock.currentTime) === 'aircraft') {
          setSelectedAircraft(props.data?.getValue(viewer.clock.currentTime));
          setSelectedCamera(null);
        } else if (props?.feedType?.getValue(viewer.clock.currentTime) === 'camera') {
          setSelectedCamera(props.data?.getValue(viewer.clock.currentTime));
          setSelectedAircraft(null);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;
    onReady(viewer);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Shader effect
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    removeShader(viewer, prevShaderRef.current);
    applyShader(viewer, shaderMode);
    prevShaderRef.current = shaderMode;
  }, [shaderMode]);

  // Aircraft feed
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.aircraft) {
      // Clear aircraft entities
      aircraftEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      aircraftEntitiesRef.current.clear();
      return;
    }

    const poll = async () => {
      try {
        const rect = viewer.camera.computeViewRectangle();
        if (!rect) return;
        const bounds = {
          lamin: Cesium.Math.toDegrees(rect.south),
          lomin: Cesium.Math.toDegrees(rect.west),
          lamax: Cesium.Math.toDegrees(rect.north),
          lomax: Cesium.Math.toDegrees(rect.east),
        };
        const aircraft = await fetchAircraft(bounds);
        const currentIds = new Set<string>();

        for (const ac of aircraft) {
          if (ac.longitude === null || ac.latitude === null) continue;
          currentIds.add(ac.icao24);
          const existing = aircraftEntitiesRef.current.get(ac.icao24);
          const pos = Cesium.Cartesian3.fromDegrees(ac.longitude, ac.latitude, (ac.baro_altitude || 0));

          if (existing) {
            existing.position = new Cesium.ConstantPositionProperty(pos);
          } else {
            const altColor = (ac.baro_altitude || 0) < 3000
              ? Cesium.Color.LIME
              : (ac.baro_altitude || 0) < 10000
                ? Cesium.Color.YELLOW
                : Cesium.Color.RED;

            const entity = viewer.entities.add({
              position: pos,
              billboard: {
                image: createAircraftIcon(altColor),
                width: 16,
                height: 16,
                rotation: -Cesium.Math.toRadians(ac.true_track || 0),
                alignedAxis: Cesium.Cartesian3.UNIT_Z,
              },
              label: {
                text: ac.callsign?.trim() || ac.icao24,
                font: '10px Share Tech Mono',
                fillColor: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.8),
                pixelOffset: new Cesium.Cartesian2(0, -14),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500_000),
                style: Cesium.LabelStyle.FILL,
              },
              properties: {
                feedType: 'aircraft',
                data: ac,
              },
            });
            aircraftEntitiesRef.current.set(ac.icao24, entity);
          }
        }

        // Remove stale
        for (const [id, entity] of aircraftEntitiesRef.current) {
          if (!currentIds.has(id)) {
            viewer.entities.remove(entity);
            aircraftEntitiesRef.current.delete(id);
          }
        }

        onFeedCountsChange({ aircraft: aircraft.length, satellites: 0, cameras: 0 });
      } catch (err) {
        console.error('Aircraft feed error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, AIRCRAFT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeLayers.aircraft]);

  // Satellite feed
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.satellites) {
      satelliteEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      satelliteEntitiesRef.current.clear();
      return;
    }

    const init = async () => {
      try {
        const sats = await fetchSatellites();
        satelliteDataRef.current = sats;

        const positions = propagateAll(sats, new Date());
        for (const sat of positions) {
          if (!sat.position) continue;
          const pos = Cesium.Cartesian3.fromDegrees(sat.position.longitude, sat.position.latitude, sat.position.altitude * 1000);
          const entity = viewer.entities.add({
            position: pos,
            point: {
              pixelSize: 4,
              color: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
            },
            label: {
              text: sat.name,
              font: '9px Share Tech Mono',
              fillColor: Cesium.Color.CYAN,
              pixelOffset: new Cesium.Cartesian2(8, 0),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              style: Cesium.LabelStyle.FILL,
            },
            properties: { feedType: 'satellite', data: sat },
          });
          satelliteEntitiesRef.current.set(sat.name, entity);
        }

        onFeedCountsChange({ aircraft: 0, satellites: positions.length, cameras: 0 });
      } catch (err) {
        console.error('Satellite feed error:', err);
      }
    };

    init();

    // Update positions periodically
    const interval = setInterval(() => {
      const positions = propagateAll(satelliteDataRef.current, new Date());
      for (const sat of positions) {
        if (!sat.position) continue;
        const entity = satelliteEntitiesRef.current.get(sat.name);
        if (entity) {
          entity.position = new Cesium.ConstantPositionProperty(
            Cesium.Cartesian3.fromDegrees(sat.position.longitude, sat.position.latitude, sat.position.altitude * 1000)
          );
        }
      }
    }, SATELLITE_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [activeLayers.satellites]);

  // CCTV feed
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.cctv) {
      cameraEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      cameraEntitiesRef.current.clear();
      return;
    }

    const cameras = loadCameras();
    for (const cam of cameras) {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, 50),
        billboard: {
          image: createCameraIcon(),
          width: 20,
          height: 20,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200_000),
        },
        label: {
          text: cam.name,
          font: '9px Share Tech Mono',
          fillColor: Cesium.Color.ORANGE,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50_000),
          style: Cesium.LabelStyle.FILL,
        },
        properties: { feedType: 'camera', data: cam },
      });
      cameraEntitiesRef.current.set(cam.id, entity);
    }
    onFeedCountsChange({ aircraft: 0, satellites: 0, cameras: cameras.length });

    return () => {
      cameraEntitiesRef.current.forEach(e => viewer.entities.remove(e));
      cameraEntitiesRef.current.clear();
    };
  }, [activeLayers.cctv]);

  // GIBS layers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (activeLayers.gibs) {
      const layer = createGIBSLayer(GIBS_LAYERS[0]);
      viewer.imageryLayers.addImageryProvider(layer);
    }
  }, [activeLayers.gibs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const modes: Record<string, ShaderMode> = {
        '1': 'normal', '2': 'nvg', '3': 'flir', '4': 'crt', '5': 'cel', '6': 'classified',
      };
      // Shader shortcuts handled by parent via DOM events
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {selectedAircraft && (
        <div className="info-panel">
          <button className="close-btn" onClick={() => setSelectedAircraft(null)}>X</button>
          <h4>AIRCRAFT</h4>
          <div className="row"><span className="label">CALLSIGN</span><span>{selectedAircraft.callsign?.trim() || 'N/A'}</span></div>
          <div className="row"><span className="label">ICAO24</span><span>{selectedAircraft.icao24}</span></div>
          <div className="row"><span className="label">ORIGIN</span><span>{selectedAircraft.origin_country}</span></div>
          <div className="row"><span className="label">ALTITUDE</span><span>{selectedAircraft.baro_altitude?.toFixed(0) || '?'} m</span></div>
          <div className="row"><span className="label">VELOCITY</span><span>{selectedAircraft.velocity?.toFixed(0) || '?'} m/s</span></div>
          <div className="row"><span className="label">HEADING</span><span>{selectedAircraft.true_track?.toFixed(1) || '?'}°</span></div>
          <div className="row"><span className="label">VERT RATE</span><span>{selectedAircraft.vertical_rate?.toFixed(1) || '?'} m/s</span></div>
        </div>
      )}
      {selectedCamera && (
        <div className="video-panel">
          <div className="video-header">
            <span style={{ color: 'var(--accent-green)', fontSize: 11 }}>{selectedCamera.name}</span>
            <button className="close-btn" onClick={() => setSelectedCamera(null)}>X</button>
          </div>
          <img
            src={selectedCamera.url}
            alt={selectedCamera.name}
            style={{ width: '100%' }}
            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
          />
        </div>
      )}
    </>
  );
}

// Simple canvas-based aircraft icon
function createAircraftIcon(color: Cesium.Color): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `rgba(${color.red * 255}, ${color.green * 255}, ${color.blue * 255}, 1)`;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(14, 12);
  ctx.lineTo(8, 9);
  ctx.lineTo(2, 12);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

function createCameraIcon(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff6b00';
  ctx.fillRect(3, 5, 10, 10);
  ctx.beginPath();
  ctx.moveTo(13, 7);
  ctx.lineTo(18, 4);
  ctx.lineTo(18, 16);
  ctx.lineTo(13, 13);
  ctx.closePath();
  ctx.fill();
  // Lens
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(8, 10, 3, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
