import '../scss/style.scss';

import { Collection, Feature, Graticule, Map, Overlay, View } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { FeatureLike } from 'ol/Feature';
import { unByKey } from 'ol/Observable';
import { FullScreen, MousePosition, OverviewMap, ScaleLine, defaults as defaultControls } from 'ol/control';
import { Coordinate, toStringXY } from 'ol/coordinate';
import { Extent } from 'ol/extent';
import Point from 'ol/geom/Point';
import { Layer, Tile as TileLayer, Vector } from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import { fromLonLat } from 'ol/proj';
import { Cluster, OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';

import { Download } from './control/Download';
import LayerList from './control/LayerList';
import ZoomToExtent from './control/ZoomToExtent';
import Mapbox, { MapboxType } from './source/Mapbox';
import { createElement, randomNumber } from './util';

function createIcon(iconName: string) {
  return createElement('i', { className: 'material-icons', innerText: iconName });
}

const view = new View({
  center: fromLonLat([110.367, -7.7829]),
  zoom: 12,
});

const graticule = new Graticule({
  properties: {
    name: 'Graticule',
  },
  targetSize: 200,
  showLabels: true,
  lonLabelPosition: 0.96,
  latLabelPosition: 0.99,
  zIndex: Infinity,
});

const osmLayer = new TileLayer({
  properties: {
    name: 'OpenSteetMap',
    basemap: true,
  },
  source: new OSM(),
  zIndex: -1,
});

const layers: Layer[] = [graticule, osmLayer];

for (const key in MapboxType) {
  const type = MapboxType[key] as MapboxType;
  const layer = new TileLayer({
    properties: {
      name: `Mapbox ${key.replace('_', ' ')}`,
      basemap: true,
    },
    source: new Mapbox({ type }),
    zIndex: -1,
    visible: false,
  });
  layers.push(layer);
}

const overviewMap = new OverviewMap({
  collapsed: false,
  label: createIcon('chevron_right'),
  collapseLabel: createIcon('chevron_left'),
});

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
    new LayerList(),
    new Download(),
    overviewMap,
  ]),
});

(window as any).map = map;

map.once('postrender', () => {
  const extent = view.calculateExtent();
  map.addControl(new ZoomToExtent({ extent }));
});

/**
 * ============================================================
 * Vector Layer
 * ============================================================
 */

const vectorSource = new VectorSource();
const vectorStyleCache: { [key: number]: Style } = {};
const vectorLayer = new Vector({
  properties: {
    name: 'Random Points',
  },
  source: new Cluster({ source: vectorSource, distance: 30 }),
  style: feature => {
    const featureCount: number = feature.get('features').length;
    if (!vectorStyleCache[featureCount]) {
      let radius = 6;
      let text: Text;
      if (featureCount > 1) {
        radius = Math.min(radius * 2 + featureCount, 40);
        text = new Text({
          text: String(featureCount),
          font: 'bold 14px sans-serif',
          fill: new Fill({ color: '#fff' }),
        });
      }
      vectorStyleCache[featureCount] = new Style({
        image: new Circle({
          radius,
          fill: new Fill({ color: '#df0000' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.75)', width: 4 }),
        }),
        text,
      });
    }
    return vectorStyleCache[featureCount];
  },
});
map.addLayer(vectorLayer);

const featureInfoOverlay = new Overlay({
  element: createElement('div', null, {
    style: {
      background: '#fff',
      borderRadius: '4px',
      padding: '4px 8px',
      boxShadow: '2px 2px 8px rgba(0,0,0,.6)',
    },
  }),
  className: 'feature-info',
});
featureInfoOverlay.setMap(map);

const generateRandomPoint = (extent: Extent, count: number) => {
  const [minx, miny, maxx, maxy] = extent;
  const points: Point[] = [];
  for (let i = 0; i < count; ++i) {
    const x = randomNumber(minx, maxx, 8);
    const y = randomNumber(miny, maxy, 8);
    points.push(new Point([x, y]));
  }
  return points;
};

const showFeatureInfo = (features: FeatureLike | FeatureLike[], position: Coordinate) => {
  if (!Array.isArray(features)) features = [features];
  featureInfoOverlay.getElement().innerHTML = '';
  const tbl = createElement('table', null, { style: { width: '100%' } });
  features.forEach((feature, i, arr) => {
    const props = feature.getProperties();
    for (const k in props) {
      if (k === 'geometry') continue;
      const tr = createElement('tr');
      const thKey = createElement('th', { innerText: k });
      const tdVal = createElement('td', { innerText: String(props[k]) });
      tr.append(thKey, tdVal);
      tbl.append(tr);
      if (i + 1 !== arr.length)
        tbl.append(createElement('tr', null, { style: { height: '.5rem' } }));
    }
    featureInfoOverlay.getElement().append(tbl);
  });
  featureInfoOverlay.setPosition(position);
};

map.once('postrender', () => {
  generateRandomPoint(view.calculateExtent(), 100).forEach((geometry, i) => {
    vectorSource.addFeature(new Feature({ name: `Feature ${i + 1}`, geometry }));
  });
});

map.on('click', e => {
  featureInfoOverlay.setPosition(undefined);
  map.forEachFeatureAtPixel(e.pixel, feature => {
    showFeatureInfo(feature.get('features') || feature, e.coordinate);
  });
});

/**
 * ============================================================
 */

/**
 * ============================================================
 * Overview Map layer setup
 * ============================================================
 */
const ovMapLayers = overviewMap.getOverviewMap().getLayers();
const attachBasemapListener = (layer: TileLayer) => {
  const changeVisibleKey = layer.on('change:visible', () => {
    if (layer.getVisible()) {
      ovMapLayers.clear();
      ovMapLayers.push(new TileLayer({ source: layer.getSource() }));
    }
  });
  layer.set('changeVisibleKey', changeVisibleKey);
};
const basemapCollection = new Collection(
  map
    .getLayers()
    .getArray()
    .filter(l => !!l.get('basemap'))
    .map((layer: TileLayer) => {
      attachBasemapListener(layer);
      return layer;
    }),
);

const bm = basemapCollection.getArray().find(l => l.getVisible());
if (bm) ovMapLayers.push(new TileLayer({ source: bm.getSource() }));

basemapCollection.on('add', event => {
  const layer = event.element;
  attachBasemapListener(layer);
});

basemapCollection.on('remove', event => {
  const layer = event.element;
  unByKey(layer.get('changeVisibleKey'));
  layer.unset('changeVisibleKey');
});

map.getLayers().on(['add', 'remove'], (event: CollectionEvent<BaseLayer>) => {
  if (event.element.get('basemap') && event.element instanceof TileLayer) {
    if (event.type === 'add') basemapCollection.push(event.element);
    else basemapCollection.remove(event.element);
  }
});

/**
 * ============================================================
 */
