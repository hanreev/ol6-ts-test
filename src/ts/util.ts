export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  props?: { [key: string]: any },
  attrs?: { [key: string]: any },
) {
  const el = document.createElement(tagName);
  if (props) for (const k in props) el[k] = props[k];
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

export function radianToDegree(num: number) {
  return (num * 180) / Math.PI;
}

export function degreeToRadian(num: number) {
  return (num * Math.PI) / 180;
}
