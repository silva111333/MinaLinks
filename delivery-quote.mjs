export const MAX_PRICE_AGE_MS = 60000;
export function verifyDeliveryQuote(job, check, requestAgeMs) {
  const apiPrice = check?.pricingMode === 'api' && check.paymentBasis === 'not_provided' &&
    check.source === 'Shopee Affiliate Open API productOfferV2' &&
    Array.isArray(check.fields) && check.fields.length === 2 && check.fields[0] === 'priceMin' && check.fields[1] === 'priceMax';
  const pixPrice = (!check?.pricingMode || check.pricingMode === 'pix') && check?.paymentBasis === 'pix';
  if (!check || check.version !== 1 || check.productId !== job.product_id || check.message !== job.message || check.unit !== 'BRL' || !(apiPrice || pixPrice)) throw new Error('Oferta sem conferência do preço escolhido. Nada foi enviado.');
  if (![check.requestedAt, check.checkedAt, check.preparedAt].every(Number.isSafeInteger) || check.requestedAt > check.checkedAt || check.checkedAt > check.preparedAt || check.preparedAt - check.requestedAt > MAX_PRICE_AGE_MS || !Number.isFinite(requestAgeMs) || requestAgeMs < 0 || requestAgeMs > MAX_PRICE_AGE_MS) throw new Error('Conferência de preço expirada. Nada foi enviado.');
  const sourceAgeMs = check.sourceAgeMs ?? 0;
  if (!Number.isSafeInteger(sourceAgeMs) || sourceAgeMs < 0 || sourceAgeMs + requestAgeMs >= MAX_PRICE_AGE_MS) throw new Error('O preço da página verificada expirou. Nada foi enviado.');
}
