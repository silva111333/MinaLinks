export function intervalMs(config) {
  const seconds = Number(config.intervalSeconds ?? config.intervalMinutes * 60);
  return Math.max(1000, Math.round(seconds * 1000));
}
export function intervalLabel(config) {
  const seconds = intervalMs(config) / 1000;
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;
}
export function nextPollDelay(nextSendAt, now = Date.now()) {
  return Math.min(30000, Math.max(250, (nextSendAt || now + 15000) - now));
}
export function theoreticalCapacity(config) {
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = minutes(config.startTime), end = minutes(config.endTime);
  const duration = start === end ? 1440 : (end - start + 1440) % 1440;
  return Math.floor(duration * 60000 / intervalMs(config));
}
