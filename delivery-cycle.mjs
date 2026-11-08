import { completePixPreparation } from './pix-delivery.mjs';

export async function pollDelivery(api, browser) {
  const runtime = await api({ action: 'runtime' });
  if (!runtime.enabled) return { job: null, retryAfterMs: 15000 };
  if (!['api', 'pix'].includes(runtime.pricingMode)) throw new Error('Escolha do preço não confirmada pelo painel.');
  // Switching to API must also release a robot waiting at a Pix verification wall.
  // The API path never touches, reloads or navigates that browser.
  if (runtime.pricingMode === 'pix' && !await browser.ready()) return { job: null, retryAfterMs: 1500 };
  const response = await api(undefined, runtime.pricingMode);
  if ((response.job || response.preparation) && response.pricingMode !== runtime.pricingMode) return { job: null, retryAfterMs: 1500 };
  if (!response.preparation) return response;
  if (runtime.pricingMode !== 'pix') throw new Error('Preparação incompatível com o preço escolhido.');
  try { return await completePixPreparation(response.preparation, browser, api); }
  catch (error) { error.preparation = response.preparation; throw error; }
}
