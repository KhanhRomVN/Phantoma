/**
 * ------------------------------------------------------------------
 * Recon Executor
 * ------------------------------------------------------------------
 * Thực thi các recon tools bằng cách gọi ReconController.
 * Mỗi executor function gọi ReconController.executeTool() và
 * trả về { success, output, error }.
 *
 * Main functions:
 * - executeBack()               : Thực thi back tool
 * - executeCaptureScreenshot()  : Thực thi capture_screenshot tool
 * - executeClickElement()       : Thực thi click_element tool
 * - executeNavigate()           : Thực thi navigate tool
 * - executeScroll()             : Thực thi scroll tool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { ReconController } from '@renderer/controller/ReconController';
import { logger } from '@renderer/utils/logger';

// ── Module-level state ─────────────────────────────────────────────────
// Lưu file_id của screenshot mới nhất để đưa vào ref_file_ids khi gửi message tiếp theo
let lastScreenshotFileId: string | null = null;

export const getLastScreenshotFileId = (): string | null => lastScreenshotFileId;
export const clearLastScreenshotFileId = (): void => {
  lastScreenshotFileId = null;
};

// ── Types ──
import type {
  BackParams,
  CaptureScreenshotParams,
  ClickElementParams,
  CloseTabParams,
  CreateTabParams,
  FillInputParams,
  ForwardParams,
  GetPageContentParams,
  ListElementsParams,
  ListTabsParams,
  NavigateParams,
  PressKeyParams,
  ReloadParams,
  ScrollParams,
  SwitchTabParams,
  SelectOptionParams,
  WaitForParams,
  ScrollToElementParams,
  ListFramesParams,
  HoverParams,
  ClearInputParams,
  UploadFileParams,
  EvaluateJsParams,
} from '../parsers/ReconParser';

// ─── Functions ──────────────────────────────────────────────────────────
// ===== BackExecutor =====

export async function executeBack(
  _params: BackParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('back', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Navigated back',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate back',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while navigating back',
    };
  }
}

// ===== ClickElementExecutor =====

export async function executeClickElement(
  params: ClickElementParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('click_element', {
      targetId,
      ref: params.ref,
      clickType: params.clickType,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Clicked element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to click element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while clicking element',
    };
  }
}

// ===== CloseTabExecutor =====

export async function executeCloseTab(
  params: CloseTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('close_tab', {
      targetId,
      tabId: params.tabId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tab closed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to close tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while closing tab',
    };
  }
}

// ===== CreateTabExecutor =====

export async function executeCreateTab(
  params: CreateTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('create_tab', {
      targetId,
      url: params.url,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tab created successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while creating tab',
    };
  }
}

// ===== FillInputExecutor =====

export async function executeFillInput(
  params: FillInputParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('fill_input', {
      targetId,
      ref: params.ref,
      value: params.value,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Filled input: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fill input',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while filling input',
    };
  }
}

// ===== ForwardExecutor =====

export async function executeForward(
  _params: ForwardParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('forward', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Navigated forward',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate forward',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while navigating forward',
    };
  }
}

// ===== GetPageContentExecutor =====

export async function executeGetPageContent(
  params: GetPageContentParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('get_page_content', {
      targetId,
      maxChars: params.maxChars,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Page content retrieved',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to get page content',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while getting page content',
    };
  }
}

// ===== ListElementsExecutor =====

export async function executeListElements(
  params: ListElementsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('list_elements', {
      targetId,
      elementType: params.elementType,
      labelContains: params.labelContains,
      visibleOnly: params.visibleOnly,
      limit: params.limit,
      offset: params.offset,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Elements listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list elements',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing elements',
    };
  }
}

// ===== ListTabsExecutor =====

export async function executeListTabs(
  _params: ListTabsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('list_tabs', { targetId });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Tabs listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list tabs',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing tabs',
    };
  }
}

// ===== NavigateExecutor =====

export async function executeNavigate(
  params: NavigateParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('navigate', {
      targetId,
      url: params.url,
      waitUntil: params.waitUntil,
      timeoutMs: params.timeoutMs,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Navigated to ${params.url}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to navigate',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error during navigation',
    };
  }
}

// ===== PressKeyExecutor =====

export async function executePressKey(
  params: PressKeyParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('press_key', {
      targetId,
      key: params.key,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Pressed key: ${params.key}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to press key',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while pressing key',
    };
  }
}

// ===== ReloadExecutor =====

export async function executeReload(
  _params: ReloadParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('reload', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Page reloaded',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to reload page',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while reloading page',
    };
  }
}

// ===== ScrollExecutor =====

export async function executeScroll(
  params: ScrollParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('scroll', {
      targetId,
      direction: params.direction,
      amount: params.amount,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled ${params.direction}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling',
    };
  }
}

// ===== SwitchTabExecutor =====

export async function executeSwitchTab(
  params: SwitchTabParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('switch_tab', {
      targetId,
      tabId: params.tabId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Switched tab successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to switch tab',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while switching tab',
    };
  }
}

// ===== CaptureScreenshotExecutor =====

export async function executeCaptureScreenshot(
  params: CaptureScreenshotParams,
): Promise<{ success: boolean; output?: string; error?: string; data?: any }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('capture_screenshot', {
      targetId,
      fullPage: params.fullPage,
    });

    if (result.success) {
      const imageBase64 = result.data?.imageBase64;
      const title = result.data?.title || 'Screenshot';
      const url = result.data?.url || '';

      // Upload image to server
      const apiUrl =
        (window as any).localStorage?.getItem('zen-backend-api-url') || 'http://localhost:8888';
      const accountStr = (window as any).localStorage?.getItem('zen_last_account');
      let accountId = '';
      if (accountStr) {
        try {
          const account = JSON.parse(accountStr);
          accountId = account.id || '';
        } catch {}
      }

      if (!accountId) {
        return {
          success: true,
          output: `Screenshot captured: ${title}\nURL: ${url}\nImage (base64): ${imageBase64?.substring(0, 100)}...`,
          data: { imageBase64, title, url },
        };
      }

      // Convert base64 to Blob and upload
      try {
        const arr = imageBase64.split(',');
        const mime = 'image/png';
        const bstr = atob(arr[0].startsWith('data:') ? arr[0].split(',')[1] : arr[0]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });

        const formData = new FormData();
        formData.append('file', blob, `screenshot-${Date.now()}.png`);

        const uploadUrl = `${apiUrl}/v1/uploads/accounts/${accountId}/uploads`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.data?.file_id) {
            // [DEBUG] Lưu file_id để dùng cho message tiếp theo
            lastScreenshotFileId = uploadData.data.file_id;

            return {
              success: true,
              output: `Screenshot captured and uploaded.\nFile ID: ${uploadData.data.file_id}\nTitle: ${title}\nURL: ${url}`,
              data: {
                imageBase64,
                file_id: uploadData.data.file_id,
                title,
                url,
              },
            };
          }
        }
      } catch (uploadErr: any) {
        logger.warn('[executeCaptureScreenshot] Upload failed:', uploadErr);
      }

      return {
        success: true,
        output: `Screenshot captured: ${title}\nURL: ${url}\nImage (base64): ${imageBase64?.substring(0, 100)}...`,
        data: { imageBase64, title, url },
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to capture screenshot',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while capturing screenshot',
    };
  }
}

// ===== SelectOptionExecutor =====

export async function executeSelectOption(
  params: SelectOptionParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('select_option', {
      targetId,
      ref: params.ref,
      value: params.value,
      label: params.label,
      frameId: params.frameId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Selected option: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to select option',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while selecting option',
    };
  }
}

// ===== WaitForExecutor =====

export async function executeWaitFor(
  params: WaitForParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('wait_for', {
      targetId,
      condition: params.condition,
      ref: params.ref,
      text: params.text,
      timeoutMs: params.timeoutMs,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Waited for: ${params.condition}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to wait',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while waiting',
    };
  }
}

// ===== ScrollToElementExecutor =====

export async function executeScrollToElement(
  params: ScrollToElementParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('scroll_to_element', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Scrolled to element: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to scroll to element',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while scrolling to element',
    };
  }
}

// ===== ListFramesExecutor =====

export async function executeListFrames(
  _params: ListFramesParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('list_frames', {
      targetId,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'Frames listed successfully',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to list frames',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while listing frames',
    };
  }
}

// ===== HoverExecutor =====

export async function executeHover(
  params: HoverParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('hover', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Hovered: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to hover',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while hovering',
    };
  }
}

// ===== ClearInputExecutor =====

export async function executeClearInput(
  params: ClearInputParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('clear_input', {
      targetId,
      ref: params.ref,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Cleared input: ${params.ref}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to clear input',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while clearing input',
    };
  }
}

// ===== UploadFileExecutor =====

export async function executeUploadFile(
  params: UploadFileParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('upload_file', {
      targetId,
      ref: params.ref,
      filePath: params.filePath,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Uploaded file: ${params.filePath}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to upload file',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while uploading file',
    };
  }
}

// ===== EvaluateJsExecutor =====

export async function executeEvaluateJs(
  params: EvaluateJsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('evaluate_js', {
      targetId,
      script: params.script,
    });

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || 'JS executed',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to evaluate JS',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while evaluating JS',
    };
  }
}
