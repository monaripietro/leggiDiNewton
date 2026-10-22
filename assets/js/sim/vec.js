// Piccole funzioni numeriche condivise dai modelli fisici (moto in una dimensione).

export const G = 9.81; // accelerazione di gravità, m/s²

export const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
export const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

/** Trasforma metri in pixel con una scala costante dichiarata da ogni simulazione. */
export const toPx = (meters, pxPerMeter) => meters * pxPerMeter;
