/**
 * MapStackController — manages interchangeable globe/map backends.
 * Adapted from reference repo's mapStackController.js.
 * 
 * Stacks: Google 3D (Photorealistic 3D Tiles), Bing Aerial, Bing Labels, OSM
 * Plus Re:Earth keyless terrain for non-photoreal stacks.
 */
import * as Cesium from 'cesium';
import { GOOGLE_MAPS_API_KEY, CESIUM_ION_TOKEN } from '../config/constants';

export interface MapStack {
  id: string;
  label: string;
  shortLabel: string;
  kind: 'photoreal' | 'ion' | 'osm';
  requiresIon: boolean;
  ionStyle?: Cesium.IonWorldImageryStyle;
}

export const MAP_STACKS: MapStack[] = [
  {
    id: 'photoreal',
    label: 'Google 3D',
    shortLabel: '3D',
    kind: 'photoreal',
    requiresIon: false,
  },
  {
    id: 'bing-aerial',
    label: 'Bing Aerial',
    shortLabel: 'Aerial',
    kind: 'ion',
    requiresIon: true,
    ionStyle: Cesium.IonWorldImageryStyle.AERIAL,
  },
  {
    id: 'bing-labels',
    label: 'Bing Labels',
    shortLabel: 'Labels',
    kind: 'ion',
    requiresIon: true,
    ionStyle: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  },
  {
    id: 'osm',
    label: 'OSM',
    shortLabel: 'OSM',
    kind: 'osm',
    requiresIon: false,
  },
];

const REEARTH_TERRAIN_URL = 'https://terrain.reearth.land/cesium-mesh/ellipsoid';

export class MapStackController {
  private viewer: Cesium.Viewer;
  private googleTileset: Cesium.Cesium3DTileset | null = null;
  private currentStack: string;
  private baseImageryLayer: Cesium.ImageryLayer | null = null;
  private onChange?: (stackId: string) => void;

  constructor(viewer: Cesium.Viewer, options: {
    initialStack?: string;
    onChange?: (stackId: string) => void;
  } = {}) {
    this.viewer = viewer;
    this.currentStack = options.initialStack || 'photoreal';
    this.onChange = options.onChange;
  }

  async switchTo(stackId: string): Promise<void> {
    const stack = MAP_STACKS.find(s => s.id === stackId);
    if (!stack) return;
    if (stackId === this.currentStack) return;

    // Remove current base imagery
    if (this.baseImageryLayer) {
      this.viewer.imageryLayers.remove(this.baseImageryLayer);
      this.baseImageryLayer = null;
    }

    // Remove Google 3D tileset if switching away from photoreal
    if (this.googleTileset) {
      this.viewer.scene.primitives.remove(this.googleTileset);
      this.googleTileset = null;
    }

    // Set up new stack
    if (stack.kind === 'photoreal' && GOOGLE_MAPS_API_KEY) {
      try {
        const tileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`,
          { showCreditsOnScreen: true, maximumScreenSpaceError: 16 }
        );
        this.viewer.scene.primitives.add(tileset);
        this.googleTileset = tileset;
      } catch (e) {
        console.error('Failed to load Google 3D Tiles:', e);
      }
    } else if (stack.kind === 'ion' && stack.ionStyle && CESIUM_ION_TOKEN) {
      const provider = await Cesium.IonImageryProvider.fromAssetId(
        stack.ionStyle === Cesium.IonWorldImageryStyle.AERIAL ? 2 : 3
      );
      this.baseImageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    } else if (stack.kind === 'osm') {
      this.baseImageryLayer = this.viewer.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
      );
    }

    this.currentStack = stackId;
    this.onChange?.(stackId);
  }

  getCurrentStack(): string {
    return this.currentStack;
  }
}
