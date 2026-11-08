export async function completePixPreparation(preparation, browser, confirm) {
  if (!preparation || preparation.version !== 1 || typeof preparation.jobId !== 'string' || typeof preparation.nonce !== 'string' || preparation.nonce.length < 32) throw new Error('O painel não forneceu uma preparação Pix válida.');
  const url = new URL(preparation.pageUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['shopee.com.br', 'www.shopee.com.br'].includes(url.hostname)) throw new Error('Página de preço inválida.');
  const snapshot = await browser.confirm(preparation);
  const response = await confirm({ action: 'confirm_pix', id: preparation.jobId, nonce: preparation.nonce, snapshot });
  if (response.job && (response.job.id !== preparation.jobId || response.job.product_id !== preparation.productId || response.priceCheck?.paymentBasis !== 'pix')) throw new Error('A autorização de envio não corresponde ao produto confirmado no Pix.');
  return response;
}
