import '../scss/style.scss';

import { Feature, Graticule, Map, View } from 'ol';
import { FullScreen, MousePosition, OverviewMap, Rotate, ScaleLine, defaults as defaultControls } from 'ol/control';
import { toStringXY } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import { Layer, Tile as TileLayer, Vector } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import RenderEvent from 'ol/render/Event';
import { OSM, XYZ } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { fromEvent } from 'rxjs';
import { take } from 'rxjs/operators';

import { Download } from './controls/Download';
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
  center: fromLonLat([110.367, -7.7829]),
  zoom: 12,
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
      projection: 'EPSG:4326',
    }),
    new ScaleLine(),
    new Rotate(),
    new OverviewMap({
      layers: [new TileLayer({ source: gmapLayerSources.Road })],
      collapsible: false,
    }),
    new LayerList(),
    new Download(),
  ]),
});

(window as any).map = map;

fromEvent<RenderEvent>(map, 'rendercomplete')
  .pipe(take(1))
  .subscribe(e => {
    console.log(e);
  });

const vectorSource = new VectorSource();
const vectorLayer = new Vector({
  source: vectorSource,
  style: new Style({
    image: new Circle({
      radius: 6,
      fill: new Fill({ color: '#ffaa00' }),
      stroke: new Stroke({ color: '#ffaa00', width: 2 }),
    }),
  }),
});
map.addLayer(vectorLayer);
const feature = new Feature({
  name: 'JOG',
});
feature.setGeometry(new Point(view.getCenter()));
vectorSource.addFeature(feature);
map.on('click', e => {
  map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
    alert(feature.get('name'));
  });

  map.forEachLayerAtPixel(e.pixel, layer => {
    if (layer.get('basemap')) console.log(layer.get('name'));
  });
});
