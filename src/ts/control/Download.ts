import Control, { Options as BaseOptions } from 'ol/control/Control';

export class Download extends Control {
  constructor(options: BaseOptions = {}) {
    options.element = document.createElement('div');
    super(options);
    this.element.className = 'ol-control ol-unselectable ol-download';
    const button = document.createElement('button');
    button.title = 'Download';
    button.innerHTML = '<i class="material-icons">cloud_download</i>';
    button.addEventListener('click', () => {
      const map = this.getMap();
      if (!map) return;
      map.once('rendercomplete', () => {
        const size = map.getSize();
        const dlCanvas = document.createElement('canvas');
        const dlContext = dlCanvas.getContext('2d');
        dlCanvas.width = size[0];
        dlCanvas.height = size[1];
        const canvasEls = map
          .getTargetElement()
          .querySelectorAll<HTMLCanvasElement>('.ol-layers canvas');
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

        if (navigator.msSaveBlob) {
          // link download attribuute does not work on MS browsers
          navigator.msSaveBlob((dlCanvas as any).msToBlob(), 'map.png');
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
