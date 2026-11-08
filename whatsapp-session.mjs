// Authentication state is separate from the delivery journal. Revoking a
// login must never erase sent/uncertain deliveries or enable duplicate sends.
export function createSessionStore(database, { initCreds, reviver, replacer, convertKey = (_type, value) => value, onChange = () => {} }) {
  let generation = 0;
  const read = id => {
    const row = database.prepare('SELECT value FROM state WHERE id=?').get(id);
    return row ? JSON.parse(row.value, reviver) : undefined;
  };
  const write = (id, value) => {
    if (value == null) database.prepare('DELETE FROM state WHERE id=?').run(id);
    else database.prepare('INSERT INTO state(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(id, JSON.stringify(value, replacer));
    onChange();
  };
  return {
    dump() {
      return JSON.stringify(database.prepare('SELECT id,value FROM state ORDER BY id').all());
    },
    restore(snapshot) {
      const rows = JSON.parse(snapshot);
      if (!Array.isArray(rows) || rows.length > 20000) throw new Error('Sessão remota inválida.');
      database.exec('BEGIN');
      try {
        database.prepare('DELETE FROM state').run();
        const insert = database.prepare('INSERT INTO state(id,value) VALUES(?,?)');
        for (const row of rows) {
          if (!row || typeof row.id !== 'string' || typeof row.value !== 'string') throw new Error('Sessão remota inválida.');
          JSON.parse(row.value);
          insert.run(row.id, row.value);
        }
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    open() {
      const version = ++generation;
      const active = () => version === generation;
      const creds = read('creds') || initCreds();
      write('creds', creds);
      const state = { creds, keys: {
        async get(type, ids) {
          if (!active()) return {};
          const result = {};
          for (const id of ids) {
            const value = read(`${type}:${id}`);
            if (value != null) result[id] = convertKey(type, value);
          }
          return result;
        },
        async set(data) {
          if (!active()) return;
          database.exec('BEGIN');
          try {
            for (const [type, entries] of Object.entries(data)) for (const [id, value] of Object.entries(entries)) write(`${type}:${id}`, value);
            database.exec('COMMIT');
          } catch (error) { database.exec('ROLLBACK'); throw error; }
        },
      } };
      return { state, active, save() { if (active()) write('creds', state.creds); } };
    },
    revoke(session) {
      if (!session.active()) return false;
      ++generation;
      database.prepare('DELETE FROM state').run();
      onChange();
      return true;
    },
  };
}

export async function sendOnCurrentConnection(expected, getCurrent, destination, content) {
  const current = getCurrent();
  if (!expected || current.socket !== expected || current.status !== 'open') throw new Error('A conexão mudou antes do envio. Confira a oferta no histórico.');
  return expected.sendMessage(destination, content);
}
