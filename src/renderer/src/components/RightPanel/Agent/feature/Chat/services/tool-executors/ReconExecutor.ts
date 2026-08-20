/**
 * ------------------------------------------------------------------
 * Recon Executor
 * ------------------------------------------------------------------
 * Thực thi các recon tools bằng cách gọi ReconController.
 * Mỗi executor function gọi ReconController.executeTool() và
 * trả về { success, output, error }.
 *
 * Main functions:
 * - executeBack()          : Thực thi back tool
 * - executeClickElement()  : Thực thi click_element tool
 * - executeNavigate()      : Thực thi navigate tool
 * - executeScroll()        : Thực thi scroll tool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Controller ──
import { ReconController } from '@renderer/controller/ReconController';

// ── Types ──
import type {
  BackParams,
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
} from '../parsers/ReconParser';

// ─── Functions ──────────────────────────────────────────────────────────
// ===== BackExecutor =====

export async function executeBack(
  params: BackParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('back', {
      targetId,
      tabId: params.tabId,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('click_element', {
      targetId,
      tabId: params.tabId,
      ref: params.ref,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('fill_input', {
      targetId,
      tabId: params.tabId,
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
  params: ForwardParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('forward', {
      targetId,
      tabId: params.tabId,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('get_page_content', {
      targetId,
      tabId: params.tabId,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('list_elements', {
      targetId,
      tabId: params.tabId,
      elementType: params.elementType,
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
  params: ListTabsParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('navigate', {
      targetId,
      tabId: params.tabId,
      url: params.url,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('press_key', {
      targetId,
      tabId: params.tabId,
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
  params: ReloadParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('reload', {
      targetId,
      tabId: params.tabId,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

    const result = await ReconController.executeTool('scroll', {
      targetId,
      tabId: params.tabId,
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
    let targetId = params.targetId;
    if (!targetId) {
      const controller = ReconController.getInstance();
      const activeTarget = controller.getActiveTarget();
      if (!activeTarget) {
        return {
          success: false,
          error: 'No active target selected. Please specify targetId or select a target.',
        };
      }
      targetId = activeTarget.id;
    }

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