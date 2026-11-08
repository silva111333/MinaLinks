import { verifyDeliveryQuote } from './delivery-quote.mjs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function imageBytes(url, fetcher) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  const response = await fetcher(parsed.href, { signal: AbortSignal.timeout(10000) });
  if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '') ||
      Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES || !response.body) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_IMAGE_BYTES) { await reader.cancel(); return null; }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return length ? Buffer.concat(chunks, length) : null;
}

// Download optional media before the final quote check. Passing an image URL to
// sendMessage would defer this network request until after that check.
export async function prepareDeliveryContent(job, quote, requestAge, fetcher = fetch) {
  verifyDeliveryQuote(job, quote, requestAge());
  let image = null;
  if (job.image_url) {
    try { image = await imageBytes(job.image_url, fetcher); }
    catch { /* An unavailable image does not change the confirmed message. */ }
  }
  verifyDeliveryQuote(job, quote, requestAge());
  return image ? { image, caption: job.message } : { text: job.message };
}
