/**
 * Barrel re-export — mỗi parser đã được tách ra file riêng.
 * File này giữ lại để các import cũ (`from '../parsers/ReconParser'`) tiếp tục chạy.
 */
export * from './BackParser';
export * from './ClickElementParser';
export * from './CloseTabParser';
export * from './CreateTabParser';
export * from './FillInputParser';
export * from './ForwardParser';
export * from './GetPageContentParser';
export * from './ListElementsParser';
export * from './ListTabsParser';
export * from './NavigateParser';
export * from './PressKeyParser';
export * from './ReloadParser';
export * from './ScrollParser';
export * from './SwitchTabParser';
export * from './CaptureScreenshotParser';
export * from './SelectOptionParser';
export * from './EvaluateJsParser';
export * from './UploadFileParser';
export * from './ClearInputParser';
export * from './HoverParser';
export * from './ListFramesParser';
export * from './ScrollToElementParser';
export * from './WaitForParser';