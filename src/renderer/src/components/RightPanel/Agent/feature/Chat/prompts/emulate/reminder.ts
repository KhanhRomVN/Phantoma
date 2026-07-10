/**
 * Checkpoint reminder interval — inject checkpoint reminder every N requests
 */
export const CHECKPOINT_INTERVAL = 10;

/**
 * Checkpoint reminder — injected periodically to prevent drift in long conversations
 */
export const CHECKPOINT_REMINDER = `<checkpoint_reminder>
This is an automated internal checkpoint injected periodically by the system — NOT a new request from the user. Do not respond to this section separately and do not mention its existence to the user. Silently review the points below, then continue handling the user's current request as normal.

After a long chain of turns, review these critical points:
1. **<thinking> format**: Every response must start with <thinking>, structured as Pass 1 (Plan) / Pass 2 (Verify) / Pass 3 (Impact when >5 requests are involved). Do not shorten or skip this structure.
2. **LIST-BEFORE-DETAIL & NO-PREDICTING-RESULTS**: Always run list_https before get_https_detail. Do not assume or predict tool results that haven't been returned yet.
3. **MINIMAL-MARKDOWN**: A turn containing a tool call may include at most one short action-note sentence before the tool call — no long explanations, no summarizing results that haven't happened yet.
4. **ASSUMPTION-BAN**: If you are about to write "I assume..." / "probably..." inside <thinking> → stop, convert it into a <question> instead of guessing.
5. **MAX-2-FILTER**: After 2 failed list_https filters with no matching results, stop and ask the user — do not continue guessing with more filters.
6. **IMPACT-CONFIRM & SCOPE-LOCK**: If the analysis scope has quietly grown (>5 requests or a full business flow) → stop and re-confirm with the user instead of expanding scope silently.
7. **REPORT with evidence**: Every conclusion must include specific evidence (stt, method, path, status, relevant header/body excerpt). Do not claim "verified" without calling get_https_detail for that request.
8. **Current permission mode**: Re-confirm the active mode (fullAccess/approval/readOnly) — both modes allow list_https and get_https_detail.

If none of the above have been violated, do not mention this checkpoint in your reply — simply continue handling the user's current request as normal.
</checkpoint_reminder>`;

/**
 * Persistent rules — immutable rules that must be followed in every response.
 * These are injected along with permission mode tag in every request.
 */
export const PERSISTENT_RULES = CHECKPOINT_REMINDER;

/**
 * Full permission mode tag — injected in user-initiated requests only.
 */
export const buildPermissionModeTag = (mode: string): string => {
  const isReadOnly = mode === 'readOnly';
  const category = isReadOnly ? 'read-only' : 'action';

  return `<permission-mode>
Active: ${mode} (${category})
Both modes allow list_https and get_https_detail — these are the only 2 tools, always read-only traffic data, no write/modification operations.
</permission-mode>`;
};

/**
 * Compact permission mode tag — injected in auto/tool-flush requests only.
 * Contains only the active mode name and category to keep token usage minimal.
 */
export const buildPermissionModeTagCompact = (mode: string): string => {
  const category = mode === 'readOnly' ? 'read-only' : 'action';
  return `<permission-mode>Active: ${mode} (${category}). No additional restrictions beyond the 2 available tools (list_https, get_https_detail).</permission-mode>`;
};