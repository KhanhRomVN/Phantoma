import type { SystemInfo } from "../../code/system-context";
import { buildReadOnlySystemContext } from "../shared/read-only-context";

export const buildPlannerSystemContext = (info: SystemInfo): string =>
  buildReadOnlySystemContext(info, "planner");