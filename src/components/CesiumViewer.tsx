import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { GOOGLE_MAPS_API_KEY, AIRCRAFT_POLL_INTERVAL, SATELLITE_UPDATE_INTERVAL } from '../config/constants';
import { applyShader, removeShader } from '../shaders/ShaderManager';
import { fetchAircraft, type AircraftState } from '../feeds/AircraftFeed';
import { fetchSatellites, propagateAll, type SatelliteRecord } from '../feeds/SatelliteFeed';
import { loadCameras, type Camera } from '../feeds/CCTVFeed';
import { fetchRoads } from '../feeds/TrafficFlow';
import { createGIBSLayer } from '../layers/GIBSLayerManager';
import { GIBS_LAYERS } from '../config/gibs-layers';
import type { ShaderMode, ViewState } from '../App';

interface Props {
  onReady: (viewer: Cesium.Viewer) => void;
  shaderMode: ShaderMode;
  activeLayers: Record<string, boolean>;
  onViewStateChange: (state: ViewState) => void;
  onFeedCountUpdate: (key: 'aircraft' | 'satellites' | 'cameras', count: number) => void;
}

export default function CesiumViewer({ onReady, shaderMode, activeLayers, onViewStateChange, onFeedCountUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const prevShaderRef = useRef<ShaderMode>('normal');
  const aircraftEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const satelliteEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const cameraEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const trafficPrimitivesRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const trafficAnimFrameRef = useRef<number>(0);
  const gibsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
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

    // Google Photorealistic 3D Tiles
    if (GOOGLE_MAPS_API_KEY) {
      Cesium.Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`,
        { showCreditsOnScreen: true }
      ).then(tileset => {
        viewer.scene.primitives.add(tileset);
      }).catch(err => {
        console.warn('Google 3D Tiles unavailable:', err);
      });
    }

    viewer.scene.globe.enableLighting = true;

    // HUD camera updates
    viewer.camera.changed.addEventListener(() => {
      const cart = viewer.camera.positionCartographic;
      onViewStateChange({
        lat: Cesium.Math.toDegrees(cart.latitude),
        lon: Cesium.Math.toDegrees(cart.longitude),
        alt: cart.height,
        heading: Cesium.Math.toDegrees(viewer.camera.heading),
      });
    });

    // Click handler for entities
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        const entity = picked.id as Cesium.Entity;
        const props = entity.properties;
        const time = viewer.clock.currentTime;
        if (props?.feedType?.getValue(time) === 'aircraft') {
          setSelectedAircraft(props.data?.getValue(time));
          setSelectedCamera(null);
        } else if (props?.feedType?.getValue(time) === 'camera') {
          setSelectedCamera(props.data?.getValue(time));
          setSelectedAircraft(null);
        }
      } else {
        setSelectedAircraft(null);
        setSelectedCamera(null);
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

  // ============ AIRCRAFT FEED ============
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.aircraft) {
      aircraftEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      aircraftEntitiesRef.current.clear();
      if (!activeLayers.aircraft) onFeedCountUpdate('aircraft', 0);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const rect = viewer.camera.computeViewRectangle();
        if (!rect) return;

        // Clamp bounds to avoid huge queries
        const bounds = {
          lamin: Math.max(-90, Cesium.Math.toDegrees(rect.south)),
          lomin: Math.max(-180, Cesium.Math.toDegrees(rect.west)),
          lamax: Math.min(90, Cesium.Math.toDegrees(rect.north)),
          lomax: Math.min(180, Cesium.Math.toDegrees(rect.east)),
        };

        // Skip if viewport is too large (zoomed out too far)
        if (bounds.lamax - bounds.lamin > 30 || bounds.lomax - bounds.lomin > 60) return;

        const aircraft = await fetchAircraft(bounds);
        if (cancelled) return;
        const currentIds = new Set<string>();

        for (const ac of aircraft) {
          if (ac.longitude === null || ac.latitude === null) continue;
          currentIds.add(ac.icao24);
          const existing = aircraftEntitiesRef.current.get(ac.icao24);
          const pos = Cesium.Cartesian3.fromDegrees(ac.longitude, ac.latitude, (ac.baro_altitude || 0));

          if (existing) {
            existing.position = new Cesium.ConstantPositionProperty(pos);
            // Update billboard rotation for heading changes
            if (existing.billboard) {
              existing.billboard.rotation = new Cesium.ConstantProperty(-Cesium.Math.toRadians(ac.true_track || 0));
            }
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
              properties: { feedType: 'aircraft', data: ac },
            });
            aircraftEntitiesRef.current.set(ac.icao24, entity);
          }
        }

        // Remove stale aircraft
        for (const [id, entity] of aircraftEntitiesRef.current) {
          if (!currentIds.has(id)) {
            viewer.entities.remove(entity);
            aircraftEntitiesRef.current.delete(id);
          }
        }

        onFeedCountUpdate('aircraft', currentIds.size);
      } catch (err) {
        console.error('Aircraft feed error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, AIRCRAFT_POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeLayers.aircraft]);

  // ============ SATELLITE FEED ============
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.satellites) {
      satelliteEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      satelliteEntitiesRef.current.clear();
      if (!activeLayers.satellites) onFeedCountUpdate('satellites', 0);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const sats = await fetchSatellites();
        if (cancelled) return;
        satelliteDataRef.current = sats;

        const positions = propagateAll(sats, new Date());
        let count = 0;
        for (const sat of positions) {
          if (!sat.position) continue;
          count++;
          const pos = Cesium.Cartesian3.fromDegrees(
            sat.position.longitude, sat.position.latitude, sat.position.altitude * 1000
          );
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

        onFeedCountUpdate('satellites', count);
      } catch (err) {
        console.error('Satellite feed error:', err);
      }
    };

    init();

    const interval = setInterval(() => {
      if (cancelled) return;
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

    return () => { cancelled = true; clearInterval(interval); };
  }, [activeLayers.satellites]);

  // ============ CCTV FEED ============
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.cctv) {
      cameraEntitiesRef.current.forEach(e => viewerRef.current?.entities.remove(e));
      cameraEntitiesRef.current.clear();
      if (!activeLayers.cctv) onFeedCountUpdate('cameras', 0);
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
    onFeedCountUpdate('cameras', cameras.length);

    return () => {
      cameraEntitiesRef.current.forEach(e => viewer.entities.remove(e));
      cameraEntitiesRef.current.clear();
    };
  }, [activeLayers.cctv]);

  // ============ TRAFFIC FLOW ============
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeLayers.traffic) {
      // Cleanup
      if (trafficPrimitivesRef.current) {
        viewer?.scene.primitives.remove(trafficPrimitivesRef.current);
        trafficPrimitivesRef.current = null;
      }
      if (trafficAnimFrameRef.current) {
        cancelAnimationFrame(trafficAnimFrameRef.current);
        trafficAnimFrameRef.current = 0;
      }
      return;
    }

    let cancelled = false;
    let particles: { position: Cesium.Cartesian3; progress: number; speed: number; coords: [number, number][] }[] = [];

    const pointCollection = new Cesium.PointPrimitiveCollection();
    viewer.scene.primitives.add(pointCollection);
    trafficPrimitivesRef.current = pointCollection;

    const loadTraffic = async () => {
      try {
        const rect = viewer.camera.computeViewRectangle();
        if (!rect) return;
        const alt = viewer.camera.positionCartographic.height;
        // Only load at city zoom
        if (alt > 50_000) return;

        const bounds = {
          south: Cesium.Math.toDegrees(rect.south),
          west: Cesium.Math.toDegrees(rect.west),
          north: Cesium.Math.toDegrees(rect.north),
          east: Cesium.Math.toDegrees(rect.east),
        };

        const roads = await fetchRoads(bounds);
        if (cancelled) return;

        particles = [];
        pointCollection.removeAll();

        for (const road of roads) {
          if (road.coords.length < 2) continue;
          const count = road.type === 'motorway' ? 8 : road.type === 'trunk' ? 5 : 3;
          const speed = road.type === 'motorway' ? 0.003 : road.type === 'trunk' ? 0.002 : 0.001;

          for (let i = 0; i < count; i++) {
            const progress = Math.random();
            const pos = interpolateRoad(road.coords, progress);
            const point = pointCollection.add({
              position: Cesium.Cartesian3.fromDegrees(pos[0], pos[1], 5),
              pixelSize: 3,
              color: road.type === 'motorway'
                ? Cesium.Color.fromCssColorString('#00ff41')
                : road.type === 'trunk'
                  ? Cesium.Color.YELLOW
                  : Cesium.Color.fromCssColorString('#00cc33'),
            });
            particles.push({ position: point.position, progress, speed, coords: road.coords });
          }
        }
      } catch (err) {
        console.error('Traffic flow error:', err);
      }
    };

    loadTraffic();

    // Animate particles
    const animate = () => {
      if (cancelled) return;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.progress = (p.progress + p.speed) % 1;
        const pos = interpolateRoad(p.coords, p.progress);
        const point = pointCollection.get(i);
        if (point) {
          point.position = Cesium.Cartesian3.fromDegrees(pos[0], pos[1], 5);
        }
      }
      trafficAnimFrameRef.current = requestAnimationFrame(animate);
    };
    // Start animation after a short delay for data to load
    setTimeout(() => { if (!cancelled) animate(); }, 2000);

    return () => {
      cancelled = true;
      if (trafficAnimFrameRef.current) cancelAnimationFrame(trafficAnimFrameRef.current);
      if (trafficPrimitivesRef.current) {
        viewer.scene.primitives.remove(trafficPrimitivesRef.current);
        trafficPrimitivesRef.current = null;
      }
    };
  }, [activeLayers.traffic]);

  // ============ GIBS LAYERS ============
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Remove existing GIBS layer
    if (gibsLayerRef.current) {
      viewer.imageryLayers.remove(gibsLayerRef.current);
      gibsLayerRef.current = null;
    }

    if (activeLayers.gibs) {
      const provider = createGIBSLayer(GIBS_LAYERS[0]);
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.7;
      gibsLayerRef.current = layer;
    }

    return () => {
      if (gibsLayerRef.current && viewer && !viewer.isDestroyed()) {
        viewer.imageryLayers.remove(gibsLayerRef.current);
        gibsLayerRef.current = null;
      }
    };
  }, [activeLayers.gibs]);

  // ============ INDIVIDUAL GIBS LAYERS ============
  const gibsIndividualRefs = useRef<Map<string, Cesium.ImageryLayer>>(new Map());

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    for (const layerConfig of GIBS_LAYERS) {
      const key = `gibs_${layerConfig.id}`;
      const isActive = activeLayers[key];
      const existing = gibsIndividualRefs.current.get(layerConfig.id);

      if (isActive && !existing) {
        const provider = createGIBSLayer(layerConfig);
        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = 0.7;
        gibsIndividualRefs.current.set(layerConfig.id, layer);
      } else if (!isActive && existing) {
        viewer.imageryLayers.remove(existing);
        gibsIndividualRefs.current.delete(layerConfig.id);
      }
    }
  }, [
    activeLayers.gibs_modis_truecolor,
    activeLayers.gibs_viirs_nightlights,
    activeLayers.gibs_firms_fire,
    activeLayers.gibs_aerosol,
    activeLayers.gibs_sst,
  ]);

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
            onError={(e) => { (e.target as HTMLImageElement).alt = 'Feed unavailable'; }}
          />
        </div>
      )}
    </>
  );
}

// Interpolate position along a road's coordinate array
function interpolateRoad(coords: [number, number][], t: number): [number, number] {
  if (coords.length < 2) return coords[0];
  const totalSegments = coords.length - 1;
  const segFloat = t * totalSegments;
  const seg = Math.min(Math.floor(segFloat), totalSegments - 1);
  const frac = segFloat - seg;
  return [
    coords[seg][0] + (coords[seg + 1][0] - coords[seg][0]) * frac,
    coords[seg][1] + (coords[seg + 1][1] - coords[seg][1]) * frac,
  ];
}

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
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(8, 10, 3, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
