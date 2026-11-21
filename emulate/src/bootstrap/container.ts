/**
 * ------------------------------------------------------------------
 * Dependency Container (composition root)
 * ------------------------------------------------------------------
 * The only place where repositories are instantiated and injected into
 * the application services. Everything above this layer (controllers)
 * receives ready-made services, and everything below it (repositories)
 * knows nothing about who uses it.
 *
 * Must be created AFTER the database is initialised.
 * ------------------------------------------------------------------
 */

import { TargetRepository } from '../repositories/target.repository';
import { TargetFilterRepository } from '../repositories/target-http-filter.repository';
import { ReportRepository } from '../repositories/report.repository';
import { FuzzerFileStorage } from '../storage/fuzzer-file.storage';
import { TargetService } from '../services/emulate/target.service';
import { TargetFilterService } from '../services/emulate/target-filter.service';
import { FuzzerService } from '../services/emulate/fuzzer.service';
import { ReportService } from '../services/emulate/report.service';

export interface Container {
  targetService: TargetService;
  targetFilterService: TargetFilterService;
  fuzzerService: FuzzerService;
  reportService: ReportService;
}

export function createContainer(): Container {
  // Repositories (persistence)
  const targetRepo = new TargetRepository();
  const targetFilterRepo = new TargetFilterRepository();
  const reportRepo = new ReportRepository();
  const fuzzerStorage = new FuzzerFileStorage();

  // Services (business logic)
  return {
    targetService: new TargetService(targetRepo),
    targetFilterService: new TargetFilterService(targetFilterRepo),
    fuzzerService: new FuzzerService(fuzzerStorage),
    reportService: new ReportService(reportRepo),
  };
}