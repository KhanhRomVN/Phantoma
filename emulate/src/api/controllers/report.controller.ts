/**
 * ------------------------------------------------------------------
 * Report Controller
 * ------------------------------------------------------------------
 * HTTP handlers for /emulate-targets/:targetId/reports.
 * ------------------------------------------------------------------
 */

import { asyncHandler } from '../middleware/async-handler.middleware';
import { AppError } from '../../errors/app.error';
import { json } from '../../utils/http-response.util';
import type { CreateReportInput, UpdateReportInput } from '../../domain';
import type { ReportService } from '../../services/emulate/report.service';

export class ReportController {
  constructor(private readonly service: ReportService) {}

  list = asyncHandler((req, res) => {
    json(res, 200, this.service.getReportsByTarget(req.params.targetId));
  });

  create = asyncHandler((req, res) => {
    const input = req.body as CreateReportInput;
    input.emulate_target_id = req.params.targetId;
    if (!input.content) throw new AppError('content is required', 400);

    json(res, 201, this.service.createReport(input));
  });

  get = asyncHandler((req, res) => {
    const report = this.service.getReportByID(req.params.targetId, req.params.reportId);
    if (!report) throw new AppError('report not found', 404);

    json(res, 200, report);
  });

  update = asyncHandler((req, res) => {
    const input = req.body as UpdateReportInput;
    const report = this.service.updateReport(req.params.targetId, req.params.reportId, input);
    if (!report) throw new AppError('report not found', 404);

    json(res, 200, report);
  });

  remove = asyncHandler((req, res) => {
    const deleted = this.service.deleteReport(req.params.targetId, req.params.reportId);
    if (!deleted) throw new AppError('report not found', 404);

    json(res, 200, { deleted: true });
  });
}
