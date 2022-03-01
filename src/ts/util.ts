import { View } from 'ol';
import * as extentUtil from 'ol/extent';
import Geometry from 'ol/geom/Geometry';
import { Vector as VectorLayer } from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import { ProjectionLike, get as getProj } from 'ol/proj';
import { Cluster, Vector as VectorSource } from 'ol/source';

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  props?: Partial<HTMLElementTagNameMap[K]>,
  attrs?: { style?: Partial<CSSStyleDeclaration>; [key: string]: any },
) {
  const el = document.createElement(tagName);
  if (props) for (const k in props) el[k] = props[k];
  if (attrs)
    for (const k in attrs)
      if (k === 'style' && typeof attrs[k] === 'object')
        for (const sk in attrs.style) el.style[sk] = attrs.style[sk];
      else el.setAttribute(k, attrs[k]);
  return el;
}

export function radianToDegree(num: number) {
  return (num * 180) / Math.PI;
}

export function degreeToRadian(num: number) {
  return (num * Math.PI) / 180;
}

export interface HasZIndex {
  getZIndex(): number;
}

export function sortByZIndex(a: HasZIndex, b: HasZIndex, descending = false) {
  const aZ = a.getZIndex() || 0;
  const bZ = b.getZIndex() || 0;
  if (descending) return aZ > bZ ? -1 : aZ < bZ ? 1 : 0;
  return aZ > bZ ? 1 : aZ < bZ ? -1 : 0;
}

export function randomNumber(min: number, max: number, roundToDigit?: number) {
  let n = Math.random() * (max - min) + min;
  if (roundToDigit) {
    const m = Math.pow(10, roundToDigit);
    n = Math.round(n * m) / m;
  }
  return n;
}

export function randomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getLayerExtent(layer: BaseLayer, projection?: ProjectionLike) {
  let extent = layer.getExtent() || extentUtil.createEmpty();
  if (extentUtil.isEmpty(extent) && layer instanceof VectorLayer) {
    let source: VectorSource<Geometry> = layer.getSource();
    if (source instanceof Cluster) source = source.getSource();
    if (source.getFeatures().length > 0) {
      extent = source.getExtent() || extentUtil.createEmpty();
    } else {
      extent = await new Promise(resolve => {
        let counter = 0;
        source.once('addfeature', () => {
          const timer = setInterval(() => {
            const fc = source.getFeatures().length;
            if (fc <= counter) {
              clearInterval(timer);
              resolve(source.getExtent());
            } else counter = fc;
          }, 500);
        });
        source.loadFeatures(extentUtil.createEmpty(), Infinity, getProj(projection));
      });
    }
  } else if (layer instanceof LayerGroup) {
    for (const lyr of layer.getLayers().getArray()) {
      const ext = await getLayerExtent(lyr, projection);
      if (ext && !extentUtil.isEmpty(ext)) extent = extentUtil.extend(extent, ext);
    }
  }
  return extent;
}

export function zoomToLayer(view: View, layer: BaseLayer, duration = 500) {
  getLayerExtent(layer, view.getProjection())
    .then(extent => {
      view.fit(extent, { duration, padding: [16, 16, 16, 16] });
    })
    .catch(err => console.error(err));
}
