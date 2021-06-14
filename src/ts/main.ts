import { Graticule, Map, View } from 'ol';
import { FullScreen, MousePosition, OverviewMap, Rotate, ScaleLine, defaults as defaultControls } from 'ol/control';
import { toStringXY } from 'ol/coordinate';
import { Layer, Tile as TileLayer } from 'ol/layer';
import { OSM, XYZ } from 'ol/source';

import LayerList from './controls/LayerList';

const gmapLayerCodes = {
  Road: 'm',
  Terrain: 'p',
  Satellite: 's',
  Hybrid: 'y',
};

const gmapLayerSources: { [key in keyof typeof gmapLayerCodes]?: XYZ } = {};

for (const layerType in gmapLayerCodes) {
  const layerCode = gmapLayerCodes[layerType];
  const source = new XYZ({
    url: `https://mt{0-3}.google.com/vt/?lyrs=${layerCode}&x={x}&y={y}&z={z}&hl=id`,
    attributions: 'Google Maps',
    crossOrigin: 'anonymous',
    maxZoom: 21,
  });
  source.set('name', `Google Maps ${layerType}`);
  gmapLayerSources[layerType] = source;
}

const view = new View({
  center: [110.36, -7.8],
  zoom: 14,
  projection: 'EPSG:4326',
});

const graticule = new Graticule({
  targetSize: 200,
  showLabels: true,
  lonLabelPosition: 0.96,
  latLabelPosition: 0.99,
  zIndex: Infinity,
});

const osmLayer = new TileLayer({ source: new OSM(), zIndex: 0, visible: false });
osmLayer.set('basemap', true);
osmLayer.set('name', 'OpenStreetMap');

const layers: Layer[] = [graticule, osmLayer];

for (const layerType in gmapLayerSources) {
  const source = gmapLayerSources[layerType];
  const layer = new TileLayer({ source, zIndex: 0, visible: layerType === 'Road' });
  layer.set('name', `Google Maps ${layerType}`);
  layer.set('basemap', true);
  layers.push(layer);
}

const map = new Map({
  target: 'map',
  view,
  layers,
  controls: defaultControls({ attributionOptions: { collapsible: false } }).extend([
    new FullScreen(),
    new MousePosition({
      coordinateFormat: coord => toStringXY(coord, 6),
    }),
    new ScaleLine(),
    new Rotate(),
    new OverviewMap({
      layers: [new TileLayer({ source: gmapLayerSources.Road })],
      collapsible: false,
    }),
    new LayerList(),
  ]),
});

(window as any).map = map;
