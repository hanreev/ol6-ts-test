import { PluggableMap, getUid } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { unByKey } from 'ol/Observable';
import Control, { Options as BaseOptions } from 'ol/control/Control';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';

import { createElement } from '../util';

export interface Options extends BaseOptions {
  title?: string | HTMLElement;
  className?: string;
}

const defaultTitle = 'Layer List';

export class LayerList extends Control {
  container: HTMLElement;
  private _titleEl: HTMLElement;
  private _eventKeys: { [key: string]: EventsKey | EventsKey[] } = {};
  private get _layers() {
    return this.getMap()?.getLayers().getArray() || [];
  }

  constructor(options: Options = {}) {
    super({
      element: options.element || document.createElement('div'),
      target: options.target,
    });
    this.element.className = 'ol-control';
    const className = options.className || 'ol-layer-list';
    this.element.classList.add(className);
    this.container = document.createElement('ul');
    this._titleEl = createElement('h3');
    this.element.append(this._titleEl);
    this.element.append(this.container);
    this.setTitle(options.title || defaultTitle);
  }

  setMap(map?: PluggableMap) {
    super.setMap(map);
    this.container.innerHTML = '';

    if (Object.keys(this._eventKeys).length) {
      for (const eventKeys of Object.values(this._eventKeys)) unByKey(eventKeys);
      this._eventKeys = {};
    }

    if (!map) return;

    this._layers
      .filter(layer => !!layer.get('name'))
      .sort((a, b) => {
        const aZ = a.getZIndex() || 0;
        const bZ = b.getZIndex() || 0;
        return aZ > bZ ? 1 : aZ < bZ ? -1 : 0;
      })
      .forEach(this._addLayer.bind(this));

    const uid = getUid(this);
    this._eventKeys[uid] = map
      .getLayers()
      .on(['add', 'remove'], (e: CollectionEvent<BaseLayer>) => {
        if (e.type === 'add') this._addLayer(e.element);
        else this._removeLayer(e.element);
      });
  }

  setTitle(title: string | HTMLElement) {
    this.set('title', title);
    const titleEl = typeof title === 'string' ? createElement('h3', { innerText: title }) : title;
    this._titleEl.replaceWith(titleEl);
    this._titleEl = titleEl;
  }

  getTitle(): string | HTMLElement {
    return this.get('title') || defaultTitle;
  }

  private _addLayer(layer: BaseLayer) {
    if (!layer.get('name')) return;
    const uid = getUid(layer);
    const liEl = document.createElement('li');
    liEl.setAttribute('data-uid', uid);
    const cbxEl = document.createElement('input');
    cbxEl.type = 'checkbox';
    cbxEl.checked = layer.getVisible();
    liEl.append(cbxEl, layer.get('name'));
    this.container.append(liEl);
    cbxEl.addEventListener('change', () => {
      if (layer.get('basemap'))
        this._layers
          .filter(l => l !== layer && !!l.get('basemap'))
          .forEach(l => l.setVisible(false));
      layer.setVisible(cbxEl.checked);
    });
    this._eventKeys[uid] = layer.on(['change:visible', 'change:zIndex'], e => {
      if (e.type === 'change:visible') cbxEl.checked = layer.getVisible();
    });
  }

  private _removeLayer(layer: BaseLayer) {
    const uid = getUid(layer);
    const liEl = this.container.querySelector(`li[data-uid="${uid}"]`);
    if (liEl) liEl.remove();
    if (uid in this._eventKeys) unByKey(this._eventKeys[uid]);
  }
}

export default LayerList;
