import XYZ, { Options as BaseOptions } from 'ol/source/XYZ';

export enum MapboxType {
  Streets = 'streets-v11',
  Outdoors = 'outdoors-v11',
  Light = 'light-v10',
  Dark = 'dark-v10',
  Satellite = 'satellite-v9',
  Satellite_Streets = 'satellite-streets-v11',
  Navigation_Day = 'navigation-day-v1',
  Navigation_Night = 'navigation-night-v1',
}

export interface Options extends BaseOptions {
  type?: MapboxType;
}

export const MAPBOX_ATTRIBUTION =
  '© <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>';
export const OSM_ATTRIBUTION =
  '© <a href="http://www.openstreetmap.org/about/" target="_blank">OpenStreetMap</a>';

const ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const defaultOptions: Options = {
  attributions: [MAPBOX_ATTRIBUTION, OSM_ATTRIBUTION],
  crossOrigin: 'anonymous',
  type: MapboxType.Streets,
};

export default class Mapbox extends XYZ {
  constructor(options: Options = {}) {
    options = { ...defaultOptions, ...options, tileSize: 512 };
    super(options);
    this.setType(options.type || MapboxType.Streets);
  }

  setType(type: MapboxType) {
    this.set('type', type);
    this.setUrl(
      `https://api.mapbox.com/styles/v1/mapbox/${type}/tiles/512/{z}/{x}/{y}?access_token=${ACCESS_TOKEN}`,
    );
    const attributions =
      type === MapboxType.Satellite ? MAPBOX_ATTRIBUTION : [MAPBOX_ATTRIBUTION, OSM_ATTRIBUTION];
    this.setAttributions(attributions);
  }

  getType() {
    return this.get('type') || MapboxType.Streets;
  }
}
