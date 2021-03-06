import Control from 'ol/control/Control';
import { Extent, createEmpty as createEmptyExtent } from 'ol/extent';

import { createElement } from '../util';

export type Padding = [number, number, number, number];

export interface Options {
  className?: string;
  target?: HTMLElement | string;
  label?: string | HTMLElement;
  tipLabel?: string;
  extent?: Extent;
  animationDuration?: number;
  padding?: Padding;
}

const defaultOptions: Options = {
  className: 'ol-zoom-extent',
  label: createElement('i', { className: 'material-icons', innerText: 'fit_screen' }),
  tipLabel: 'Fit to extent',
  animationDuration: 300,
};

export default class ZoomToExtent extends Control {
  constructor(options: Options = {}) {
    options = { ...defaultOptions, ...options };
    const element = createElement('div', { className: 'ol-control ol-unselectable' });
    element.classList.add(options.className);
    super({ element, target: options.target });
    this.setExtent(options.extent);
    this.setAnimationDuration(options.animationDuration);
    this.setPadding(options.padding);
    const button = createElement('button', { title: options.tipLabel });
    button.append(options.label);
    button.addEventListener('click', () => {
      this.handleZoomToExtent();
    });
    this.element.append(button);
  }

  protected handleZoomToExtent() {
    this.getMap()
      ?.getView()
      .fit(this.getExtent(), { duration: this.getAnimationDuration(), padding: this.getPadding() });
  }

  setExtent(extent: Extent) {
    this.set('extent', extent);
  }

  getExtent(): Extent {
    return this.get('extent') || createEmptyExtent();
  }

  setAnimationDuration(duration?: number) {
    this.set('duration', duration);
  }

  getAnimationDuration(): number {
    return this.get('duration') || 0;
  }

  setPadding(padding?: Padding) {
    this.set('padding', padding);
  }

  getPadding(): Padding {
    return this.get('padding');
  }
}
