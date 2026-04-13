import type { GIBSLayerConfig } from '../layers/GIBSLayerManager';

export const GIBS_LAYERS: GIBSLayerConfig[] = [
  {
    id: 'modis-truecolor',
    name: 'MODIS True Color',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    tileMatrixSetID: '250m',
    format: 'image/jpeg',
    maxLevel: 8,
  },
  {
    id: 'viirs-nightlights',
    name: 'VIIRS Night Lights',
    layer: 'VIIRS_SNPP_DayNightBand_ENCC',
    tileMatrixSetID: '500m',
    format: 'image/png',
    maxLevel: 8,
  },
  {
    id: 'firms-fire',
    name: 'Fire / Thermal Anomalies',
    layer: 'MODIS_Terra_Thermal_Anomalies_Day',
    tileMatrixSetID: '250m',
    format: 'image/png',
    maxLevel: 8,
  },
  {
    id: 'aerosol',
    name: 'Aerosol Optical Depth',
    layer: 'MODIS_Terra_Aerosol_Optical_Depth_3km',
    tileMatrixSetID: '2km',
    format: 'image/png',
    maxLevel: 6,
  },
  {
    id: 'sst',
    name: 'Sea Surface Temperature',
    layer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
    tileMatrixSetID: '1km',
    format: 'image/png',
    maxLevel: 7,
  },
];
