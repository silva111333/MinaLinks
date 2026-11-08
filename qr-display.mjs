import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export function qrDisplayHtml(image) {
  if (typeof image !== 'string' || image.length > 200000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error('Imagem de pareamento inválida.');
  return '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>MinaLinks • Conectar WhatsApp</title><style>body{margin:0;background:#101518;color:#f2f4f6;font:17px system-ui;text-align:center;padding:32px 16px}main{max-width:480px;margin:auto}img{display:block;width:320px;max-width:100%;height:auto;background:white;margin:24px auto;border-radius:12px}p{line-height:1.6;color:#c7d0d6}</style><main><h1>Conectar WhatsApp</h1><p>No WhatsApp do celular, abra <strong>Aparelhos conectados → Conectar um aparelho</strong> e escaneie a imagem.</p><img alt="QR Code do WhatsApp" src="' + image + '"><p>Mantenha o CMD aberto. Esta imagem atualiza automaticamente.</p></main></html>';
}

export function createQrDisplay(directory, { platform = process.platform, launch = spawn } = {}) {
  const file = join(resolve(directory), 'whatsapp-qr.html');
  let opened = false;
  return {
    show(image) {
      mkdirSync(resolve(directory), { recursive: true, mode: 0o700 });
      writeFileSync(file, qrDisplayHtml(image), { mode: 0o600 });
      if (platform === 'win32' && !opened) {
        const command = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe');
        const child = launch(command, ['url.dll,FileProtocolHandler', pathToFileURL(file).href], { detached: true, stdio: 'ignore', windowsHide: true });
        child.once('error', () => { opened = false; console.error('O navegador não abriu o QR Code. Use Conexões no painel.'); });
        child.unref();
        opened = true;
      }
    },
    clear(connected = false) {
      // Replace the credential instead of retaining an expired pairing image.
      writeFileSync(file, '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>MinaLinks</title><body style="background:#101518;color:white;font:20px system-ui;text-align:center;padding:48px"><h1>' + (connected ? 'WhatsApp conectado' : 'QR Code indisponível') + '</h1><p>' + (connected ? 'Volte ao painel para configurar seus grupos.' : 'Mantenha o CMD aberto para gerar um novo código.') + '</p></body></html>', { mode: 0o600 });
      opened = false;
    },
  };
}
