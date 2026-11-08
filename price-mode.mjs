// Existing installations stay Pix-only until the owner explicitly chooses API.
export function pricingMode(config) {
  return config?.pricingMode === 'api' ? 'api' : 'pix';
}
