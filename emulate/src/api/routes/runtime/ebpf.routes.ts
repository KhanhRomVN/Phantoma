/**
 * eBPF + CLI capture routes — mounted at /runtime.
 */

import { Router } from 'express';
import { ebpfController } from '../../controllers/ebpf.controller';

export function createEbpfRoutes(): Router {
  const router = Router();

  // Generic sniffer
  router.post('/ebpf/start', ebpfController.start);
  router.post('/ebpf/stop', ebpfController.stop);
  router.get('/ebpf/status', ebpfController.status);

  // CLI capture
  router.post('/ebpf', ebpfController.startCli);
  router.post('/cli/:targetId/stop', ebpfController.stopCli);

  return router;
}
