/**
 * Recon Renderer-side Handlers
 * 
 * Mỗi handler xử lý một tool recon: gọi IPC tương ứng và format kết quả.
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
export { ClickElementHandler } from './ClickElementHandler';
export { FillInputHandler } from './FillInputHandler';
export { PressKeyHandler } from './PressKeyHandler';
export { ScrollHandler } from './ScrollHandler';