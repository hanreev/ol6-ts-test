import BaseLayer from 'ol/layer/Base';

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  props?: { [key: string]: any },
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

export function sortByZIndex(a: BaseLayer, b: BaseLayer, descending = false) {
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
