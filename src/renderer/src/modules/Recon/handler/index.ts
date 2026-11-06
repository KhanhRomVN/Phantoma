/**
 * Recon Renderer-side Handlers
 *
 * Mỗi handler chỉ giữ lại khi có giao tiếp IPC: gọi IPC tương ứng và format kết quả.
 * Main process handlers are in: src/main/services/recon/
 */

export { ListTabsHandler } from './ListTabsHandler';
export { CreateTabHandler } from './CreateTabHandler';
export { CloseTabHandler } from './CloseTabHandler';
export { SwitchTabHandler } from './SwitchTabHandler';
export { NavigateHandler } from './NavigateHandler';
export { BackHandler } from './BackHandler';
export { ForwardHandler } from './ForwardHandler';
export { ReloadHandler } from './ReloadHandler';
export { GetPageContentHandler } from './GetPageContentHandler';
export { ListElementsHandler } from './ListElementsHandler';
export { ListFramesHandler } from './ListFramesHandler';
export { ClickElementHandler } from './ClickElementHandler';
export { FillInputHandler } from './FillInputHandler';
export { PressKeyHandler } from './PressKeyHandler';
export { ScrollHandler } from './ScrollHandler';
export { ScrollToElementHandler } from './ScrollToElementHandler';
export { SelectOptionHandler } from './SelectOptionHandler';
export { WaitForHandler } from './WaitForHandler';
export { HoverHandler } from './HoverHandler';
export { ClearInputHandler } from './ClearInputHandler';
export { UploadFileHandler } from './UploadFileHandler';
export { EvaluateJsHandler } from './EvaluateJsHandler';
export { CaptureScreenshotHandler } from './CaptureScreenshotHandler';
export { ReconTargetHandlers } from './ReconTargetHandlers';