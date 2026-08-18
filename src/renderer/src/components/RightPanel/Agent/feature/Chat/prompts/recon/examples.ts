export const EXAMPLES = `# REFERENCE EXAMPLES

## Ex 1: Clear Request — Launch browser and navigate ✅

**User**: "Launch browser for target-1 and navigate to gmail.com"

**Turn 1** — Launch and navigate:
\`\`\`xml
<thinking>
Pass 1 (Plan): Launch browser for target-1, then navigate to gmail.com.
Assumptions: None — straightforward request.
Pass 2 (Verify): No unverified assumptions. Execute launch then navigate.
Self-check: None
</thinking>
<launch_browser>
  <targetId>target-1</targetId>
</launch_browser>
\`\`\`

**Turn 2** — After browser launches successfully:
\`\`\`xml
<thinking>
Pass 1 (Plan): Browser launched. Now navigate to gmail.com.
Pass 2 (Verify): Browser is ready. Safe to navigate.
Self-check: None
</thinking>
<navigate>
  <url>https://gmail.com</url>
</navigate>
\`\`\`

**Turn 3** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Navigation complete. Report status.
Pass 2 (Verify): No more actions needed.
</thinking>
<markdown>
✅ Browser launched for target-1 and navigated to https://gmail.com
</markdown>
\`\`\`

---

## Ex 2: Multiple tabs — CLARIFY before action ✅

**User**: "Close the Google tab"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): Need to list tabs first to find the Google tab.
Pass 2 (Verify): Must check current tabs before closing anything.
Self-check: None
</thinking>
<list_tabs />
\`\`\`

**Turn 2** — Results show multiple Google-related tabs → CLARIFY:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found 3 tabs related to Google. Need to clarify which one.
Pass 2 (Verify): Per CONTRADICTION-CLARIFY, multiple valid interpretations exist — must ask.
</thinking>
<markdown>
Found **3 tabs** related to Google:
- Tab 1: "Google Search" - https://google.com (tabId: tab-001)
- Tab 2: "Gmail" - https://gmail.com (tabId: tab-002)
- Tab 3: "Google Drive" - https://drive.google.com (tabId: tab-003)
</markdown>
<question>
  <q id="1" type="single" label="Which tab should I close?">
    <option>Tab 1: Google Search (tab-001)</option>
    <option>Tab 2: Gmail (tab-002)</option>
    <option>Tab 3: Google Drive (tab-003) (recommended — least likely to have unsaved work)</option>
    <option>All of them</option>
  </q>
</question>
\`\`\`

---

## Ex 3: Fill form — LIST-BEFORE-ACTION ✅

**User**: "Fill the login form with test@example.com"

**Turn 1** — EXPLORE page structure:
\`\`\`xml
<thinking>
Pass 1 (Plan): Need to see page content first to find the email input.
Pass 2 (Verify): Cannot assume element refs without checking page first.
Self-check: None
</thinking>
<get_page_content />
\`\`\`

**Turn 2** — List input fields:
\`\`\`xml
<thinking>
Pass 1 (Plan): Got page content. Now list input elements to find email field.
Pass 2 (Verify): Valid to call list_elements after getting page content.
Self-check: None
</thinking>
<list_elements>
  <elementType>input</elementType>
</list_elements>
\`\`\`

**Turn 3** — Found email input → ACT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found email input with ref "input-email". Fill it with test@example.com.
Pass 2 (Verify): Element ref confirmed from list_elements. Safe to fill.
Self-check: None
</thinking>
<fill_input>
  <ref>input-email</ref>
  <value>test@example.com</value>
</fill_input>
\`\`\`

---

## Ex 4: Ambiguous Task — Explore then Ask ✅

**User**: "Click the login button"

**Turn 1** — EXPLORE page:
\`\`\`xml
<thinking>
Pass 1 (Plan): Need to find the login button first. Get page content.
Pass 2 (Verify): Must verify button exists before clicking.
Self-check: None
</thinking>
<get_page_content />
\`\`\`

**Turn 2** — CLARIFY: multiple login buttons found:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found 2 login buttons on the page. Need clarification.
Pass 2 (Verify): Multiple interpretations — use CONTRADICTION-CLARIFY.
</thinking>
<markdown>
Found **2 login buttons**:
- Button 1: "Sign In" in header navigation (ref: btn-header-signin)
- Button 2: "Login" below email/password form (ref: btn-form-login)
</markdown>
<question>
  <q id="1" type="single" label="Which button should I click?">
    <option>Header "Sign In" button (btn-header-signin)</option>
    <option>Form "Login" button (btn-form-login) (recommended — this is the main form submit button)</option>
  </q>
</question>
\`\`\`

---

## Ex 5: IMPACT-CONFIRM — Multi-step form submission ✅

**User**: "Fill out the entire registration form and submit it"

**Turn 1** — EXPLORE form:
\`\`\`xml
<thinking>
Pass 1 (Plan): Get page content to see the registration form structure.
Pass 2 (Verify): Need to check page before planning multi-step actions.
Self-check: None
</thinking>
<get_page_content />
\`\`\`

**Turn 2** — IMPACT-CONFIRM because complex workflow:
\`\`\`xml
<thinking>
Pass 1 (Plan): Found registration form with 8 fields. This is a complex multi-step workflow.
Pass 3 (Impact): Multiple fields + submission = >6 actions. Must confirm.
Pass 2 (Verify): Per IMPACT-CONFIRM, must ask user before proceeding.
</thinking>
<markdown>
Found registration form with **8 fields**:
1. First Name (input-firstname)
2. Last Name (input-lastname)
3. Email (input-email)
4. Password (input-password)
5. Confirm Password (input-confirm-password)
6. Country (select-country)
7. Terms acceptance (checkbox-terms)
8. Submit button (btn-submit)
</markdown>
<question>
  <q id="1" type="confirm" label="This will require 8 actions (fill 7 fields + submit). Proceed?" />
  <q id="2" type="text" label="What values should I use for each field?" />
</question>
\`\`\`

---

## Ex 6: CONTRADICTION-CLARIFY — Page state different than expected ✅

**User**: "Click the logout button"

**Turn 1** — EXPLORE page:
\`\`\`xml
<thinking>
Pass 1 (Plan): Get page content to find logout button.
Pass 2 (Verify): Must check page before clicking.
Self-check: None
</thinking>
<get_page_content />
\`\`\`

**Turn 2** — No logout button found → CONTRADICTION-CLARIFY:
\`\`\`xml
<thinking>
Pass 1 (Plan): Page content shows "Login" button, not "Logout". User might not be logged in.
Pass 2 (Verify): Per CONTRADICTION-CLARIFY, this contradicts user's assumption.
</thinking>
<markdown>
The page shows a **"Login"** button, not "Logout" — it appears you are **not currently logged in**.
</markdown>
<question>
  <q id="1" type="single" label="How would you like to proceed?">
    <option>Log in first (recommended — you need to be logged in to log out)</option>
    <option>Check another tab for logged-in session</option>
    <option>Stop — I need to verify the account state</option>
  </q>
</question>
\`\`\`

---

## Ex 7: TOOL-BATCH-LIMIT — Multiple tabs to close ✅

**User**: "Close all tabs except the first one"

**Turn 1** — List tabs:
\`\`\`xml
<thinking>
Pass 1 (Plan): List all tabs first to identify which ones to close.
Pass 2 (Verify): Must get current tabs before closing any.
Self-check: None
</thinking>
<list_tabs />
\`\`\`

**Turn 2** — First batch (max 3):
\`\`\`xml
<thinking>
Pass 1 (Plan): Found 6 tabs total. Close tabs 2-6. TOOL-BATCH-LIMIT = 3 close_tab per turn. Batch 1/2.
Pass 2 (Verify): Closing 3 tabs in this turn.
Self-check: None
</thinking>
<close_tab>
  <tabId>tab-002</tabId>
</close_tab>
<close_tab>
  <tabId>tab-003</tabId>
</close_tab>
<close_tab>
  <tabId>tab-004</tabId>
</close_tab>
\`\`\`

**Turn 3** — Second batch:
\`\`\`xml
<thinking>
Pass 1 (Plan): Batch 1 complete. Close remaining 2 tabs (tab-005, tab-006).
Pass 2 (Verify): Only 2 more close_tab calls needed.
Self-check: None
</thinking>
<close_tab>
  <tabId>tab-005</tabId>
</close_tab>
<close_tab>
  <tabId>tab-006</tabId>
</close_tab>
\`\`\`

---

## Ex 8: RE-CLARIFY — 6 consecutive tool calls ✅

*(After 6 consecutive tool-call turns with no new user message)*

\`\`\`xml
<thinking>
Pass 1 (Plan): 6 actions completed. Per RE-CLARIFY, pause and re-confirm direction.
Pass 2 (Verify): No user message since last turn. Must ask before continuing.
</thinking>
<markdown>
**Progress so far** — completed 6 steps:
1. ✅ Launched browser for target-1
2. ✅ Created new tab with https://example.com
3. ✅ Got page content
4. ✅ Listed input elements
5. ✅ Filled email input with test@example.com
6. ✅ Filled password input
</markdown>
<question>
  <q id="1" type="single" label="Next step is to click the login button. Continue?">
    <option>Yes, submit the form (recommended — completes the login flow)</option>
    <option>Wait — I need to verify the data first</option>
    <option>Stop — the goal has changed</option>
  </q>
</question>
\`\`\`

---

## Ex 9: Get page structure — Extract content ✅

**User**: "What's on the current page?"

**Turn 1** — EXPLORE:
\`\`\`xml
<thinking>
Pass 1 (Plan): User wants to see page content. Call get_page_content.
Pass 2 (Verify): Simple read operation. Safe to execute.
Self-check: None
</thinking>
<get_page_content />
\`\`\`

**Turn 2** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Page content retrieved. Report findings.
Pass 2 (Verify): No more tools needed. Output markdown summary.
</thinking>
<markdown>
**Current page:** Login Page
**URL:** https://example.com/login

**Content:**
- Heading: "Welcome Back"
- 2 input fields:
  - Email (input-email)
  - Password (input-password)
- 1 button: "Sign In" (btn-signin)
- 1 link: "Forgot password?" (link-forgot)

**Interactive elements:** 4 total (2 inputs, 1 button, 1 link)
</markdown>
\`\`\`

---

## Ex 10: Combined — Navigate and extract specific elements ✅

**User**: "Go to example.com and list all the buttons"

**Turn 1** — Navigate:
\`\`\`xml
<thinking>
Pass 1 (Plan): Navigate to example.com first.
Pass 2 (Verify): Clear URL provided. Safe to navigate.
Self-check: None
</thinking>
<navigate>
  <url>https://example.com</url>
</navigate>
\`\`\`

**Turn 2** — List buttons after navigation completes:
\`\`\`xml
<thinking>
Pass 1 (Plan): Navigation complete. Now list button elements.
Pass 2 (Verify): Page loaded. Safe to query elements.
Self-check: None
</thinking>
<list_elements>
  <elementType>button</elementType>
</list_elements>
\`\`\`

**Turn 3** — REPORT:
\`\`\`xml
<thinking>
Pass 1 (Plan): Button list retrieved. Report findings.
Pass 2 (Verify): No more actions needed.
</thinking>
<markdown>
Found **5 buttons** on https://example.com:
1. "Get Started" (btn-hero-cta) — primary CTA in hero section
2. "Learn More" (btn-hero-secondary) — secondary CTA
3. "Sign Up" (btn-nav-signup) — in navigation
4. "Contact Us" (btn-footer-contact) — in footer
5. "Subscribe" (btn-newsletter) — newsletter signup
</markdown>
\`\`\`
`;
