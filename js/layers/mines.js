/* ===================================================================
   PANOPTICON — Natural Resource Mines Layer (Cobalt + Lithium + Bitcoin)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';

const layer = createDataLayer({
  layerKey: 'mines',
  dataUrl: 'data/mines.json',
  idPrefix: 'mine',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'mines-count',
  logLabel: 'MINES',
  flyTo: { lon: 26.0, lat: -10.7, alt: 5_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    cobalt:  { icon: 'mineCobalt',  color: '#cc44ff', label: 'COBALT MINE' },
    lithium: { icon: 'mineLithium', color: '#00ddcc', label: 'LITHIUM MINE' },
    bitcoin: { icon: 'mineBitcoin', color: '#f7931a', label: 'BITCOIN MINE' },
  },
});

export const fetchMines    = layer.load;
export const isMinesLoaded = layer.isLoaded;
export const resetMines    = layer.reset;
export const MINES_FLY_TO  = layer.FLY_TO;
