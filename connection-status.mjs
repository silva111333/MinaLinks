// Group discovery must never prevent the panel from hearing that WhatsApp is
// still connected. Keep the last successful list during a temporary failure.
export async function publishHeartbeat(state, fetchGroups, publish, now = Date.now()) {
  let { groups = [], groupRefreshed = 0, groupAttempted = null } = state;
  let groupsUnavailable = false;
  if (state.status === 'open' && now - groupRefreshed >= 300000 &&
      (groupAttempted === null || now - groupAttempted >= 60000)) {
    groupAttempted = now;
    try {
      const all = await fetchGroups();
      groups = Object.values(all).map(group => ({
        id: group.id, name: group.subject,
        size: group.size ?? group.participants?.length ?? 0,
      }));
      groupRefreshed = now;
    } catch { groupsUnavailable = true; }
  }
  await publish({ action: 'heartbeat', status: state.status, qr: state.qr,
    groups, moduleVersion: state.moduleVersion });
  return { groups, groupRefreshed, groupAttempted, groupsUnavailable };
}

// Keep the latest QR/connection update when an older heartbeat is in flight.
// A failed request waits for the normal next cycle instead of spinning retries.
export function createHeartbeatPublisher({ readState, fetchGroups, publish, onPublished, onError }) {
  let busy = false;
  let queued = false;
  return async function heartbeat() {
    if (busy) { queued = true; return; }
    busy = true;
    try {
      do {
        queued = false;
        const state = readState();
        if (!state) return;
        try { onPublished(await publishHeartbeat(state, fetchGroups, publish), state); }
        catch (error) { onError(error); return; }
      } while (queued);
    } finally { busy = false; }
  };
}
