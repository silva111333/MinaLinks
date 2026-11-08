export const MODULE_VERSION = 'pix-price-8';
export function priceModuleNeedsUpdate(version) { return version !== MODULE_VERSION; }
// Retired clients must be updated before they can claim another offer.
export function legacyBrowserModule(version) {
  return typeof version==='string'&&/^pix-browser-\d+$/.test(version);
}
