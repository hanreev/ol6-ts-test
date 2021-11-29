import Control from 'ol/control/Control';

import { createElement } from '../util';

export interface Options {
  className?: string;
  target?: string | HTMLElement;
  label?: string | HTMLElement;
  tipLabel?: string;
}

const defaultOptions: Options = {
  className: 'ol-download',
  label: createElement('i', { className: 'material-icons', innerText: 'cloud_download' }),
  tipLabel: 'Download',
};

export class Download extends Control {
  constructor(options: Options = {}) {
    options = Object.assign({}, defaultOptions, options);
    const element = createElement('div', { className: 'ol-control ol-unselectable' });
    element.classList.add(options.className);
    super({ element, target: options.target });
    const button = createElement('button', { title: options.tipLabel });
    button.append(options.label);
    button.addEventListener('click', () => {
      const map = this.getMap();
      if (!map) return;
      map.once('postrender', () => {
        const size = map.getSize();
        const dlCanvas = createElement('canvas');
        const dlContext = dlCanvas.getContext('2d');
        dlCanvas.width = size[0];
        dlCanvas.height = size[1];
        const canvasEls = map
          .getTargetElement()
          .querySelector('.ol-viewport>.ol-layers')
          .querySelectorAll<HTMLCanvasElement>('.ol-layer>canvas');
        canvasEls.forEach(canvas => {
          if (canvas.width <= 0) return;
          const opacity = canvas.parentElement.style.opacity;
          dlContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
          const transform = canvas.style.transform;
          const matrix = transform
            .match(/^matrix\(([^(]*)\)$/)[1]
            .split(',')
            .map(Number);
          CanvasRenderingContext2D.prototype.setTransform.apply(dlContext, matrix);
          dlContext.drawImage(canvas, 0, 0);
        });

        if ((navigator as any).msSaveBlob) {
          // link download attribuute does not work on MS browsers
          (navigator as any).msSaveBlob((dlCanvas as any).msToBlob(), 'map.png');
        } else {
          const link = document.createElement('a');
          link.download = 'map.png';
          link.href = dlCanvas.toDataURL();
          link.click();
        }
      });
      map.renderSync();
    });
    this.element.append(button);
  }
}
