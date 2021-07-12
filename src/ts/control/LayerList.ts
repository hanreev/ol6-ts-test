import { PluggableMap, getUid } from 'ol';
import { CollectionEvent } from 'ol/Collection';
import { unByKey } from 'ol/Observable';
import Control, { Options as BaseOptions } from 'ol/control/Control';
import { EventsKey } from 'ol/events';
import BaseLayer from 'ol/layer/Base';

import { createElement, sortByZIndex } from '../util';

export interface Options extends BaseOptions {
  title?: string | HTMLElement;
  className?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  label?: string | HTMLElement;
  collapseLabel?: string | HTMLElement;
}

const defaultTitle = 'Layer List';

const defaultOptions: Options = {
  title: defaultTitle,
  className: 'ol-layer-list',
  collapsible: true,
  collapsed: true,
  label: createElement('i', { className: 'material-icons', innerText: 'layers' }),
  collapseLabel: createElement('i', { className: 'material-icons', innerText: 'chevron_left' }),
};

export class LayerList extends Control {
  container: HTMLElement;
  private _toggleEl: HTMLButtonElement;
  private _titleEl: HTMLElement;
  private _eventKeys: { [key: string]: EventsKey | EventsKey[] };
  private _options: Options;

  private get _layers() {
    return this.getMap()?.getLayers().getArray() || [];
  }

  constructor(options: Options = {}) {
    options = Object.assign({}, defaultOptions, options);
    options.element = options.element || createElement('div');
    if (!options.collapsible) options.collapsed = false;
    super(options);
    this._options = options;
    this.container = createElement('ul');
    this._toggleEl = createElement('button');
    this._titleEl = createElement('h3');
    this._eventKeys = {};

    this.element.className = 'ol-control';
    this.element.classList.add(options.className);
    this._toggleEl.addEventListener('click', () => {
      this.setCollapsed(!this.getCollapsed());
    });
    if (options.collapsible) this.element.append(this._toggleEl);
    else this.element.classList.add('ol-uncollapsible');
    this.element.append(this._titleEl);
    this.element.append(this.container);
    this.setTitle(options.title || defaultTitle);
    this.setCollapsed(options.collapsed);
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
      .sort(sortByZIndex)
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
    this._toggleEl.title = typeof title === 'string' ? title : title.textContent;
  }

  getTitle(): string | HTMLElement {
    return this.get('title') || defaultTitle;
  }

  setCollapsed(collapsed: boolean) {
    this.set('collapsed', collapsed);
    const display = collapsed ? 'none' : 'block';
    this._titleEl.style.display = display;
    this.container.style.display = display;
    this._toggleEl.innerHTML = '';
    this._toggleEl.append(collapsed ? this._options.label : this._options.collapseLabel);
    this.element.classList.toggle('ol-collapsed', collapsed);
  }

  getCollapsed() {
    return !!this.get('collapsed');
  }

  private _addLayer(layer: BaseLayer) {
    const uid = getUid(layer);
    const name = layer.get('name') || `${layer.constructor.name} ${uid}`;
    const liEl = createElement('li', null, { 'data-uid': uid });
    liEl.setAttribute('data-uid', uid);
    const cbxEl = createElement('input', {
      id: `layerList${uid}`,
      type: 'checkbox',
      checked: layer.getVisible(),
    });
    const lblEl = createElement('label', { innerText: name }, { for: cbxEl.id });
    liEl.append(cbxEl, lblEl);
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
