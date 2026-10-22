import type { ToolFormat } from "../shared/types";
import { buildValidationSection } from "../shared/tool-catalog";
import { ORCHESTRATOR_TOOLS } from "./tools-reference";

export const buildOrchestratorToolValidation = (
  toolFormat: ToolFormat = "xml",
): string =>
  buildValidationSection("orchestrator", ORCHESTRATOR_TOOLS, toolFormat);