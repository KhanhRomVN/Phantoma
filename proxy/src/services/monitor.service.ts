import { getConfig } from '../config/server.config';
import { createLogger } from '../utils/logger';
import { checkService } from './check.service';

const logger = createLogger('MonitorService');

let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await checkService.checkAll();
  } catch (err) {
    logger.warn(`Background check failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    running = false;
  }
}

export const monitorService = {
  start: (): void => {
    const ms = getConfig().monitorIntervalMs;
    if (timer || !(ms > 0)) return;
    logger.info(`Monitoring stored proxies every ${ms} ms`);
    void tick();
    timer = setInterval(() => void tick(), ms);
  },

  stop: (): void => {
    if (timer) clearInterval(timer);
    timer = null;
  },
};