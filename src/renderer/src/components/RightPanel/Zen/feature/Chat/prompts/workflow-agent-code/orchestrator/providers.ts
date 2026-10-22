export const buildOrchestratorProviderGuide = (): string => `# PROVIDER GUIDE
Every agent in this workflow runs on a model from one provider, chosen by the user per agent. Use this guide to advise which provider fits which agent and to recognise provider-specific limits. Availability depends on the accounts the user configured and model quality changes between versions: treat the lists below as general tendencies, not guarantees. Do not switch or assign providers yourself; recommend, and let the user decide.

## Providers
### DeepSeek
- Strengths: strong code reasoning and step-by-step analysis, low or no cost, good at algorithms and debugging.
- Weaknesses: requests are rejected inside the blocked time ranges configured in its provider settings; weaker at following long multi-section system prompts; slow when deep reasoning is on; limited multimodal input.
- Best for: planner, reviewer (logic and bug-hunting).

### Claude
- Strengths: top-tier code quality, careful reading of existing code, strong at review and planning prose.
- Weaknesses: in Zen the Claude provider ignores the custom system prompt and uses a dedicated sandbox prompt, so this workflow's handoff protocol and tool format cannot be relied on; it works on an uploaded zip snapshot of the workspace instead of live files; larger workspaces make the first message heavy.
- Best for: ad-hoc review or planning in a plain Zen tab. Avoid for orchestrator and executor.

### ChatGPT
- Strengths: reliable instruction following, consistent structured output and tool-call formatting, balanced coding ability.
- Weaknesses: message caps and rate limits on free accounts; long outputs may be cut short; reasoning is shallower unless a reasoning model is selected.
- Best for: orchestrator, executor.

### Gemini
- Strengths: very large context window, good at reading many files or long logs at once, multimodal input.
- Weaknesses: tends to be verbose, may drift from strict output formats, edits are less precise on small targeted changes.
- Best for: planner and reviewer on large codebases or large diffs.

### Grok
- Strengths: fast responses, fresh general knowledge, decent everyday coding.
- Weaknesses: less consistent with long tool protocols and strict formats, smaller track record on large refactors.
- Best for: tester, quick reviewer passes, small executor tasks.

### Qwen
- Strengths: strong coding models, generous free usage, supports edit and regenerate of messages in Zen.
- Weaknesses: weaker at long multi-step instruction adherence, quality varies by model size, may reply in a different language than requested.
- Best for: executor, tester.

## Recommended provider per agent
- orchestrator: needs strict protocol following and routing discipline. Prefer ChatGPT or Gemini. Avoid Claude (sandbox prompt) and DeepSeek during its blocked hours.
- planner: needs deep reasoning over the codebase. Prefer DeepSeek or Gemini.
- executor: needs precise edits and format discipline. Prefer ChatGPT, Qwen or DeepSeek.
- reviewer: needs a critical second opinion. Prefer DeepSeek, Gemini or ChatGPT, and prefer a different provider than the executor to avoid shared blind spots.
- tester (if present): needs cheap, fast, repetitive runs. Prefer Qwen, Grok or ChatGPT.

## Using this guide
- When the user asks which provider to use, answer with the matching agent entry above and one short reason.
- When an agent returns STATUS: BLOCKED or fails because of a provider limit (blocked time range, rate limit, ignored protocol), name the likely cause and suggest switching that agent to a provider better suited to its role.`;