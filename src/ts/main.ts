import '../scss/style.scss';

import { Feature, Graticule, Map, View } from 'ol';
import {
  FullScreen,
  MousePosition,
  OverviewMap,
  ScaleLine,
  defaults as defaultControls,
} from 'ol/control';
import { toStringXY } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import { Layer, Tile as TileLayer, Vector } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';

import { Download } from './control/Download';
import LayerList from './control/LayerList';
import Mapbox, { MapboxType } from './source/Mapbox';
import { createElement } from './util';

function createIcon(iconName: string) {
  return createElement('i', { className: 'material-icons', innerText: iconName });
}

const view = new View({
  center: fromLonLat([110.367, -7.7829]),
  zoom: 12,
});

const graticule = new Graticule({
  name: 'Graticule',
  targetSize: 200,
  showLabels: true,
  lonLabelPosition: 0.96,
  latLabelPosition: 0.99,
  zIndex: Infinity,
});

const osmLayer = new TileLayer({
  name: 'OpenSteetMap',
  basemap: true,
  source: new OSM(),
  zIndex: 0,
});

const layers: Layer[] = [graticule, osmLayer];

for (const key in MapboxType) {
  const type = MapboxType[key] as MapboxType;
  const layer = new TileLayer({
    name: `Mapbox ${key.replace('_', ' ')}`,
    basemap: true,
    source: new Mapbox({ type }),
    zIndex: 0,
    visible: false,
  });
  layers.push(layer);
}

const map = new Map({
  target: 'map',
  view,
  layers,
  controls: defaultControls({
    attributionOptions: {
      collapsed: false,
      label: createIcon('info'),
      collapseLabel: createIcon('chevron_right'),
    },
    rotateOptions: {
      label: createIcon('navigation'),
    },
    zoomOptions: {
      zoomInLabel: createIcon('add'),
      zoomOutLabel: createIcon('remove'),
    },
  }).extend([
    new FullScreen({
      label: createIcon('open_in_full'),
      labelActive: createIcon('close_fullscreen'),
      source: document.body,
    }),
    new MousePosition({
      coordinateFormat: coord => toStringXY(coord, 8),
      projection: 'EPSG:4326',
    }),
    new ScaleLine(),
    new OverviewMap({
      layers: [new TileLayer({ source: new OSM() })],
      collapsed: false,
      label: createIcon('chevron_right'),
      collapseLabel: createIcon('chevron_left'),
    }),
    new LayerList(),
    new Download(),
  ]),
});

(window as any).map = map;

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

const feature = new Feature<Point>({
  name: 'Feature 1',
});
feature.setGeometry(new Point(view.getCenter()));
vectorSource.addFeature(feature);

map.on('click', e => {
  map.forEachFeatureAtPixel(e.pixel, feature => {
    alert(feature.get('name'));
  });

  map.forEachLayerAtPixel(e.pixel, layer => {
    if (layer.get('basemap')) console.log(layer.get('name'));
  });
});
