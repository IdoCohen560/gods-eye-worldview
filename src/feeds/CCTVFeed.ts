import camerasData from '../data/cameras.json';

export interface Camera {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  url: string;
  format: string;
  city: string;
}

export function loadCameras(): Camera[] {
  return camerasData as Camera[];
}
