# Checklist: Chuyển `style={{` → `className cn()`

**Tổng: 159 matches / 42 files** | Cập nhật: 2026-07-15

---

## Đã hoàn thành ✅

- [x] `components/common/MessageInput/index.tsx` — 6 matches (còn 3: color-mix + position)

---

## Chưa làm

### Nhóm nhiều matches (ưu tiên cao)

- [ ] `feature/Home/index.tsx` — 11 matches
- [ ] `feature/Chat/components/tools/FileToolRenderer.tsx` — 10 matches
- [ ] `feature/Chat/components/SearchBar.tsx` — 9 matches
- [ ] `feature/Chat/components/blocks/QuestionAnswerBlock.tsx` — 9 matches
- [ ] `feature/Chat/components/tools/ToolRouter.tsx` — 9 matches
- [ ] `feature/Setting/index.tsx` — 6 matches
- [ ] `feature/Account/components/AddAccountDrawer.tsx` — 5 matches
- [ ] `feature/Account/components/ConfirmDeleteDrawer.tsx` — 5 matches
- [ ] `feature/Chat/components/blocks/GitStatusBlock.tsx` — 5 matches
- [ ] `feature/Chat/components/messages/AIMessageBox.tsx` — 5 matches
- [ ] `feature/Chat/components/tools/ExecuteButton.tsx` — 5 matches
- [ ] `feature/Account/components/ProviderFilterDropdown.tsx` — 4 matches
- [ ] `feature/Chat/components/ChatHeader.tsx` — 4 matches
- [ ] `feature/Chat/components/blocks/GitDiffBlock.tsx` — 4 matches
- [ ] `feature/Chat/components/messages/UserMessageBox.tsx` — 4 matches
- [ ] `feature/Chat/components/tools/TerminalToolRenderer.tsx` — 4 matches
- [ ] `feature/Chat/components/tools/ToolHeader.tsx` — 4 matches
- [ ] `feature/History/components/HistoryCard.tsx` — 4 matches
- [ ] `feature/Setting/components/LanguageSelector.tsx` — 4 matches
- [ ] `feature/Chat/components/blocks/ErrorBlock.tsx` — 3 matches
- [ ] `feature/Chat/components/blocks/RichtextBlock.tsx` — 3 matches
- [ ] `feature/Chat/components/blocks/TerminalBlock.tsx` — 3 matches
- [ ] `feature/Chat/components/blocks/thinking/ThinkingBlock.tsx` — 3 matches
- [ ] `feature/Chat/components/blocks/warning/WarningBlock.tsx` — 3 matches
- [ ] `feature/Home/components/DailyUsageChart.tsx` — 3 matches
- [ ] `feature/Home/components/ModelDistributionCard.tsx` — 3 matches
- [ ] `feature/Chat/components/ChatBody.tsx` — 2 matches
- [ ] `feature/Chat/components/ChatBodySkeleton.tsx` — 2 matches
- [ ] `feature/Chat/components/ChatErrorBoundary.tsx` — 2 matches
- [ ] `feature/Chat/components/blocks/GrepBlock.tsx` — 2 matches
- [ ] `feature/Chat/components/blocks/HtmlBlock.tsx` — 2 matches
- [ ] `feature/History/index.tsx` — 2 matches

### Nhóm 1 match (ưu tiên thấp)

- [ ] `feature/Account/components/AccountCard.tsx` — 1 match
- [ ] `feature/Account/index.tsx` — 1 match
- [ ] `feature/Account/utils/CopyableText.tsx` — 1 match
- [ ] `feature/Chat/components/ChatFooter.tsx` — 1 match
- [ ] `feature/Chat/components/blocks/FileStreamingBlock.tsx` — 1 match
- [ ] `feature/Chat/components/blocks/MarkdownBlock.tsx` — 1 match
- [ ] `feature/Chat/components/messages/ProcessingIndicator.tsx` — 1 match
- [ ] `feature/Chat/index.tsx` — 1 match
- [ ] `feature/Home/components/StatsGrid.tsx` — 1 match

---

## Ghi chú

- **Giữ nguyên** nếu: `color-mix()`, `animation`, position động (`left`/`top`/`x`/`y`), `$()` với biến không có Tailwind class
- **Chuyển được** nếu: `$('--text-primary')` → `text-text-primary`, `$('--card-background')` → `bg-card-background`, `rgba()` cố định → `bg-[rgba(...)]`, màu theme → `text-warn`, `text-error`, `text-info`, `text-purple`, `text-violet`, `text-teal`...