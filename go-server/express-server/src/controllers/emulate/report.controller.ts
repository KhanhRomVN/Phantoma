/**
 * ------------------------------------------------------------------
 * Report Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/emulate/report.go. Reports are file-based;
 * validation rules (content required on create) match the Go handler.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';

// ── Local 
import type { CreateReportInput, UpdateReportInput } from '../../domain/emulate';
import { json, fail } from '../../utils/response';
import { AppError } from '../../utils/api-error';
import { ReportService } from '../../services/emulate/report.service';

// ─── Path extraction helpers ────────────────────────────────────────────

function extractReportTargetID(path: string): string {
  const rest = path.replace('/emulate-targets/', '');
  const parts = rest.split('/');
  return parts[0] || '';
}

function extractReportID(path: string): string {
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'reports' && i + 1 < parts.length) {
      return parts[i + 1];
    }
  }
  return '';
}

// ─── Controller factory ────────────────────────────────────────────────

export function createReportController(service: ReportService) {
  return {
    listReports(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractReportTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const reports = service.getReportsByTarget(targetID);
        json(res, 200, reports);
      } catch (err) { next(err); }
    },

    getReport(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractReportTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const reportID = extractReportID(req.path);
        if (!reportID) throw new AppError('missing report id', 400);

        const report = service.getReportByID(targetID, reportID);
        if (!report) throw new AppError('report not found', 404);

        json(res, 200, report);
      } catch (err) { next(err); }
    },

    createReport(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractReportTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);

        const input = req.body as CreateReportInput;
        input.emulate_target_id = targetID;
        if (!input.content) throw new AppError('content is required', 400);

        const report = service.createReport(input);
        json(res, 201, report);
      } catch (err) { next(err); }
    },

    updateReport(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractReportTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const reportID = extractReportID(req.path);
        if (!reportID) throw new AppError('missing report id', 400);

        const input = req.body as UpdateReportInput;
        const report = service.updateReport(targetID, reportID, input);
        if (!report) throw new AppError('report not found', 404);

        json(res, 200, report);
      } catch (err) { next(err); }
    },

    deleteReport(req: Request, res: Response, next: NextFunction) {
      try {
        const targetID = extractReportTargetID(req.path);
        if (!targetID) throw new AppError('missing target id', 400);
        const reportID = extractReportID(req.path);
        if (!reportID) throw new AppError('missing report id', 400);

        const deleted = service.deleteReport(targetID, reportID);
        if (!deleted) throw new AppError('report not found', 404);

        json(res, 200, { deleted: true });
      } catch (err) { next(err); }
    },
  };
}