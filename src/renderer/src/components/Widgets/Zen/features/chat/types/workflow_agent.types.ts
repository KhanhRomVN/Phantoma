/**
 * Union of every workflow agent prompt id, across every module that supports
 * multi-agent. Code module uses the 4 coding agents; Recon module uses the 5
 * OSINT agents. A prompt id is looked up in the owning module's
 * `prompts.systemPrompts` Map by `buildSystemPrompt(moduleId, promptId, ...)`.
 */
export type WorkflowAgentId =
  | 'orchestrator'
  | 'planner'
  | 'executor'
  | 'reviewer'
  | 'tester'
  | 'recon_planner'
  | 'recon_web'
  | 'recon_local'
  | 'recon_verifier'
  | 'recon_synthesizer'
  | 'emulate_planner'
  | 'emulate_browser'
  | 'emulate_cli'
  | 'emulate_analyzer';
