import { join } from 'node:path';

// Read exactly the main product's rendered payment panel, observed in live QA.
// Never inspect recommendation cards, hidden application state or private APIs.
export function readPixSnapshot() {
  const visible = element => {
    const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
  };
  const path = location.pathname;
  if (/\/verify\/|\/buyer\/login|\/login(?:\/|$)/i.test(path)) return { blocked: true };
  const headings = [...document.querySelectorAll('h1')].filter(visible);
  if (headings.length !== 1) return null;
  const root = headings[0].closest('section');
  const panel = root?.querySelector('section');
  if (!root || !panel || !visible(panel) || panel.contains(headings[0])) return null;
  const paymentPanelText = panel.innerText;
  if (!paymentPanelText || paymentPanelText.length > 1500) return null;
  return {
    pageUrl: location.href,
    canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
    title: headings[0].innerText,
    paymentPanelText,
    documentAgeMs: Math.ceil(performance.now()),
    selectedVariants: [...root.querySelectorAll('button.selection-box-selected, button[aria-pressed="true"]')].filter(visible).map(button => button.innerText),
  };
}

const blocked = snapshot => snapshot?.blocked === true;
function verificationError(message) { const error = new Error(message); error.kind = 'verification_required'; return error; }
function pageProductId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['shopee.com.br', 'www.shopee.com.br'].includes(url.hostname)) return null;
    const match = url.pathname.match(/(?:-i\.|\/product\/)([1-9]\d*)[./]([1-9]\d*)\/?$/);
    return match ? `${match[1]}:${match[2]}` : null;
  } catch { return null; }
}
function freshRecoveredPage(snapshot, productId) {
  return snapshot && !blocked(snapshot) && pageProductId(snapshot.pageUrl) === productId &&
    pageProductId(snapshot.canonicalUrl) === productId &&
    Number.isSafeInteger(snapshot.documentAgeMs) && snapshot.documentAgeMs >= 0 && snapshot.documentAgeMs < 60000;
}
export async function collectPixSnapshot(page, preparation, { now = Date.now, timeoutMs = 25000, readCurrent = false } = {}) {
  // Never navigate away from a verification/login wall to try another route.
  const before = await page.evaluate(readPixSnapshot);
  if (blocked(before)) throw verificationError('Conclua a verificação na janela da Shopee. Nenhuma nova tentativa foi feita.');
  if (readCurrent) {
    if (!freshRecoveredPage(before, preparation.productId)) throw verificationError('A página verificada está antiga ou não corresponde à oferta. Abra o produto novamente na janela do robô para confirmar um preço atual.');
  } else if (await page.url() !== preparation.pageUrl) await page.goto(preparation.pageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  else await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  const until = now() + timeoutMs;
  let previous;
  do {
    const snapshot = await page.evaluate(readPixSnapshot);
    if (blocked(snapshot)) throw verificationError('A Shopee pediu login ou verificação. Oferta não enviada; conclua na janela aberta.');
    if (readCurrent && !freshRecoveredPage(snapshot, preparation.productId)) throw verificationError('A página ainda não confirmou um produto atual. Nada foi enviado.');
    if (snapshot && /(?:no|via)\s+Pix\b/i.test(snapshot.paymentPanelText)) {
      const { documentAgeMs, ...stableFields } = snapshot;
      const fingerprint = JSON.stringify(stableFields);
      if (fingerprint === previous) return { ...snapshot, sourceAgeMs: readCurrent ? documentAgeMs : 0, resumedAfterVerification: readCurrent };
      previous = fingerprint;
    } else previous = undefined;
    await page.waitForTimeout(500);
  } while (now() < until);
  const error = new Error('O anúncio não confirmou o preço Pix. Nenhum preço de outro pagamento foi usado.'); error.kind = 'pix_missing'; throw error;
}

// While a human-verification wall is open, observe only the same page. A manual
// completion resumes that product without another reload or alternate route.
export function createPixPageSession(page) {
  let waitingProductId = null;
  return {
    async ready() {
      if (!waitingProductId) return true;
      if (page.isClosed()) return false;
      return !!freshRecoveredPage(await page.evaluate(readPixSnapshot), waitingProductId);
    },
    async confirm(preparation) {
      try {
        const snapshot = await collectPixSnapshot(page, preparation, { readCurrent: waitingProductId !== null });
        waitingProductId = null;
        return snapshot;
      } catch (error) {
        if (error.kind === 'verification_required') {
          waitingProductId = preparation.productId;
          try { await page.bringToFront?.(); } catch { /* Keep the verification wall intact. */ }
        } else waitingProductId = null;
        throw error;
      }
    },
  };
}

export function createPixBrowser(directory) {
  let context, page, session;
  return {
    async ready() { return session ? session.ready() : true; },
    async confirm(preparation) {
      if (!context) {
        const { chromium } = await import('playwright-core');
        // One persistent, visible browser. No stealth, proxy, account rotation,
        // headless fallback, CAPTCHA solving, checkout or automated login.
        context = await chromium.launchPersistentContext(join(directory, 'shopee-precos'), {
          channel: process.env.SHOPEE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chrome'),
          headless: false, locale: 'pt-BR', viewport: { width: 1280, height: 900 }, timeout: 15000,
        });
        context.on('close', () => { context = null; page = null; session = null; });
        page = context.pages()[0] || await context.newPage();
        session = createPixPageSession(page);
      }
      if (!page || page.isClosed()) throw new Error('A janela da Shopee foi fechada. Abra o iniciador novamente.');
      return session.confirm(preparation);
    },
    async close() { if (context) await context.close(); },
  };
}
