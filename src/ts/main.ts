import 'ol/ol.css';
import '../scss/style.scss';

import { Collection, Feature, Graticule, Map, Overlay, View } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { FeatureLike } from 'ol/Feature';
import { unByKey } from 'ol/Observable';
import {
  FullScreen,
  MousePosition,
  OverviewMap,
  ScaleLine,
  defaults as defaultControls,
} from 'ol/control';
import { Coordinate, toStringXY } from 'ol/coordinate';
import { Extent } from 'ol/extent';
import { MVT } from 'ol/format';
import { Geometry, Point } from 'ol/geom';
import {
  Layer,
  Tile as TileLayer,
  Vector as VectorLayer,
  VectorTile as VectorTileLayer,
} from 'ol/layer';
import { fromLonLat, get as getProjection, transformExtent } from 'ol/proj';
import {
  Cluster,
  OSM,
  Tile as TileSource,
  Vector as VectorSource,
  VectorTile as VectorTileSource,
} from 'ol/source';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { createXYZ } from 'ol/tilegrid';

import { Download } from './control/Download';
import LayerList from './control/LayerList';
import ZoomToExtent from './control/ZoomToExtent';
import Mapbox, { MapboxType } from './source/Mapbox';
import { createElement, randomNumber } from './util';

function createIcon(iconName: string) {
  return createElement('i', { className: 'material-icons', innerText: iconName });
}

const projection = getProjection('EPSG:900913');

const view = new View({
  projection,
  center: fromLonLat([110.367, -7.7829], projection),
  zoom: 12,
});

const graticule = new Graticule({
  properties: {
    name: 'Graticule',
  },
  targetSize: 200,
  showLabels: true,
  zIndex: Infinity,
});

const osmLayer = new TileLayer({
  properties: {
    name: 'OpenSteetMap',
    basemap: true,
  },
  source: new OSM(),
});

const layers: Layer<VectorSource<Geometry> | TileSource>[] = [graticule, osmLayer];

for (const key in MapboxType) {
  const type = MapboxType[key] as MapboxType;
  const layer = new TileLayer({
    properties: {
      name: `Mapbox ${key.replace('_', ' ')}`,
      basemap: true,
    },
    source: new Mapbox({ type }),
    visible: false,
  });
  layers.push(layer);
}

const overviewMap = new OverviewMap({
  view: new View({
    center: view.getCenter(),
    projection: view.getProjection(),
  }),
  collapsed: false,
  label: createIcon('chevron_right'),
  collapseLabel: createIcon('chevron_left'),
});

const map = new Map({
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

window.addEventListener('load', () => {
  map.setTarget('map');
});

(window as any).map = map;

map.once('rendercomplete', () => {
  const extent = view.calculateExtent();
  map.addControl(new ZoomToExtent({ extent }));
});

/**
 * ============================================================
 * Vector Layer
 * ============================================================
 */

const clusterStyleCache: Record<number, Style> = {};
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  properties: {
    name: 'Random Points',
  },
  source: new Cluster({ source: vectorSource, distance: 30 }),
  style: feature => {
    const featureCount: number = feature.get('features').length;
    if (!clusterStyleCache[featureCount]) {
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
      clusterStyleCache[featureCount] = new Style({
        image: new Circle({
          radius,
          fill: new Fill({ color: '#df0000' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.75)', width: 4 }),
        }),
        text,
      });
    }
    return clusterStyleCache[featureCount];
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

map.once('rendercomplete', () => {
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
const attachBasemapListener = (layer: TileLayer<TileSource>) => {
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
    .map((layer: TileLayer<TileSource>) => {
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

map.getLayers().on(['add', 'remove'], (event: CollectionEvent) => {
  if (event.element.get('basemap') && event.element instanceof TileLayer) {
    if (event.type === 'add') basemapCollection.push(event.element);
    else basemapCollection.remove(event.element);
  }
});
/**
 * ============================================================
 */

/**
 * ============================================================
 * Geoserver MVT
 * ============================================================
 */

const vectorTileLayer = new VectorTileLayer({
  properties: {
    name: 'NYC Landmarks',
  },
  source: new VectorTileSource({
    tileGrid: createXYZ({ maxZoom: 23 }),
    format: new MVT(),
    url: `https://server1.karomap.com/geoserver/gwc/service/tms/1.0.0/karomap:poly_landmarks@${projection.getCode()}@pbf/{z}/{x}/{-y}.pbf`,
  }),
  extent: transformExtent([-74.047185, 40.679648, -73.90782, 40.882078], 'EPSG:4326', projection),
  style: new Style({
    fill: new Fill({ color: 'rgba(0,180,240,0.6)' }),
    stroke: new Stroke({ color: 'rgb(0,140,200)', width: 1, lineCap: 'round', lineJoin: 'bevel' }),
  }),
});

map.addLayer(vectorTileLayer);
/**
 * ============================================================
 */
