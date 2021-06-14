import { PluggableMap, getUid } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { unByKey } from 'ol/Observable';
import Control, { Options as BaseOptions } from 'ol/control/Control';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';

export interface Options extends BaseOptions {
  className?: string;
}

export class LayerList extends Control {
  container: HTMLElement;
  private _eventKeys: { [key: string]: EventsKey | EventsKey[] } = {};

  constructor(options: Options = {}) {
    super({
      element: options.element || document.createElement('div'),
      target: options.target,
    });
    this.element.className = 'ol-control';
    const className = options.className || 'ol-layer-list';
    this.element.classList.add(className);
    this.container = document.createElement('ul');
    this.element.append(this.container);
  }

  setMap(map?: PluggableMap) {
    super.setMap(map);
    this.container.innerHTML = '';

    if (Object.keys(this._eventKeys).length) {
      for (const eventKeys of Object.values(this._eventKeys)) unByKey(eventKeys);
      this._eventKeys = {};
    }

    if (map) {
      map
        .getLayers()
        .getArray()
        .filter(layer => !!layer.get('name'))
        .sort((a, b) => {
          const aZ = a.getZIndex() || 0;
          const bZ = b.getZIndex() || 0;
          return aZ > bZ ? 1 : aZ < bZ ? -1 : 0;
        })
        .forEach(this._addLayer.bind(this));

      const uid = getUid(this);
      this._eventKeys[uid] = map.getLayers().on(['add', 'remove'], (e: CollectionEvent<BaseLayer>) => {
        if (e.type === 'add') this._addLayer(e.element);
        else this._removeLayer(e.element);
      });
    }
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
