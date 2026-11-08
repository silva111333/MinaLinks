// libsignal writes full SessionEntry objects (including ratchet keys) directly
// to console, independently of Baileys' logger. Suppress only those routine
// dumps; retain all other output, especially connection and delivery errors.
const privateSessionMessages = new Set([
  'Closing session:',
  'Opening session:',
  'Removing old closed session:',
  'Session already closed',
]);

export function protectSessionLogs(target = console) {
  const restore = [];
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    if (typeof target[level] !== 'function') continue;
    const original = target[level];
    const guarded = function (...args) {
      if (privateSessionMessages.has(args[0])) return;
      return Reflect.apply(original, target, args);
    };
    target[level] = guarded;
    restore.push(() => { if (target[level] === guarded) target[level] = original; });
  }
  return () => restore.forEach(fn => fn());
}
