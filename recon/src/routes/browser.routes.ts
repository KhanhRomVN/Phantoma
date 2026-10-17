/**
 * Browser Routes
 * API endpoints cho browser automation
 */
import { Router } from 'express';
import { browserManager } from '../services/browser-manager.service';
import { automationService } from '../services/automation.service';

const router = Router();

/**
 * Launch browser
 */
router.post('/launch', async (req, res) => {
  try {
    const { targetId, executablePath, headless } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const session = await browserManager.launch({
      targetId,
      executablePath,
      headless,
    });

    res.json({
      success: true,
      data: {
        targetId: session.targetId,
        pid: session.pid,
      },
    });
  } catch (error: any) {
    console.error('[Browser Routes] Launch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Close browser
 */
router.post('/close', async (req, res) => {
  try {
    const { targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const success = await browserManager.close(targetId);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Session not found' });
    }
  } catch (error: any) {
    console.error('[Browser Routes] Close failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get browser status
 */
router.get('/status', async (req, res) => {
  try {
    const { targetId } = req.query;

    if (targetId) {
      const session = browserManager.getSession(targetId as string);
      res.json({
        success: true,
        data: {
          targetId,
          isActive: !!session,
          pid: session?.pid,
        },
      });
    } else {
      const sessions = browserManager.getAllSessions();
      res.json({
        success: true,
        data: sessions.map((s) => ({
          targetId: s.targetId,
          isActive: true,
          pid: s.pid,
        })),
      });
    }
  } catch (error: any) {
    console.error('[Browser Routes] Status check failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List tabs
 */
router.get('/tabs', async (req, res) => {
  try {
    const { targetId } = req.query;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const tabs = await browserManager.listTabs(targetId as string);

    res.json({ success: true, data: { tabs } });
  } catch (error: any) {
    console.error('[Browser Routes] List tabs failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create tab
 */
router.post('/tabs', async (req, res) => {
  try {
    const { targetId, url } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const result = await browserManager.createTab(targetId, url);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Browser Routes] Create tab failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Close tab
 */
router.delete('/tabs', async (req, res) => {
  try {
    const { targetId, tabId } = req.body;

    if (!targetId || !tabId) {
      return res.status(400).json({ success: false, error: 'targetId and tabId are required' });
    }

    await browserManager.closeTab(targetId, tabId);

    res.json({ success: true, data: { tabId } });
  } catch (error: any) {
    console.error('[Browser Routes] Close tab failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Switch tab
 */
router.post('/tabs/switch', async (req, res) => {
  try {
    const { targetId, tabId } = req.body;

    if (!targetId || !tabId) {
      return res.status(400).json({ success: false, error: 'targetId and tabId are required' });
    }

    await browserManager.switchTab(targetId, tabId);

    res.json({ success: true, data: { tabId } });
  } catch (error: any) {
    console.error('[Browser Routes] Switch tab failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Navigate
 */
router.post('/navigate', async (req, res) => {
  try {
    const { targetId, url, tabId, waitUntil, timeoutMs } = req.body;

    if (!targetId || !url) {
      return res.status(400).json({ success: false, error: 'targetId and url are required' });
    }

    await automationService.navigate(targetId, url, tabId, waitUntil, timeoutMs);

    res.json({ success: true, data: { targetId, url } });
  } catch (error: any) {
    console.error('[Browser Routes] Navigate failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Back
 */
router.post('/back', async (req, res) => {
  try {
    const { targetId, tabId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    await automationService.back(targetId, tabId);

    const page = browserManager.getActivePage(targetId);
    res.json({ success: true, data: { url: page?.url() } });
  } catch (error: any) {
    console.error('[Browser Routes] Back failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Forward
 */
router.post('/forward', async (req, res) => {
  try {
    const { targetId, tabId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    await automationService.forward(targetId, tabId);

    const page = browserManager.getActivePage(targetId);
    res.json({ success: true, data: { url: page?.url() } });
  } catch (error: any) {
    console.error('[Browser Routes] Forward failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reload
 */
router.post('/reload', async (req, res) => {
  try {
    const { targetId, tabId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    await automationService.reload(targetId, tabId);

    const page = browserManager.getActivePage(targetId);
    res.json({ success: true, data: { url: page?.url() } });
  } catch (error: any) {
    console.error('[Browser Routes] Reload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get page content
 */
router.get('/content', async (req, res) => {
  try {
    const { targetId, tabId } = req.query;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const content = await automationService.getPageContent(targetId as string, tabId as string);

    res.json({ success: true, data: content });
  } catch (error: any) {
    console.error('[Browser Routes] Get content failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Click element
 */
router.post('/click', async (req, res) => {
  try {
    const { targetId, selector, tabId } = req.body;

    if (!targetId || !selector) {
      return res.status(400).json({ success: false, error: 'targetId and selector are required' });
    }

    await automationService.clickElement(targetId, selector, tabId);

    res.json({ success: true, data: { selector } });
  } catch (error: any) {
    console.error('[Browser Routes] Click failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Fill input
 */
router.post('/fill', async (req, res) => {
  try {
    const { targetId, selector, value, tabId } = req.body;

    if (!targetId || !selector || value === undefined) {
      return res.status(400).json({ success: false, error: 'targetId, selector, and value are required' });
    }

    await automationService.fillInput(targetId, selector, value, tabId);

    res.json({ success: true, data: { selector, value } });
  } catch (error: any) {
    console.error('[Browser Routes] Fill failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Press key
 */
router.post('/key', async (req, res) => {
  try {
    const { targetId, key, tabId } = req.body;

    if (!targetId || !key) {
      return res.status(400).json({ success: false, error: 'targetId and key are required' });
    }

    await automationService.pressKey(targetId, key, tabId);

    res.json({ success: true, data: { key } });
  } catch (error: any) {
    console.error('[Browser Routes] Press key failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Screenshot
 */
router.get('/screenshot', async (req, res) => {
  try {
    const { targetId, tabId, fullPage } = req.query;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required' });
    }

    const imageBase64 = await automationService.screenshot(
      targetId as string,
      fullPage === 'true',
      tabId as string,
    );

    res.json({ success: true, data: { imageBase64 } });
  } catch (error: any) {
    console.error('[Browser Routes] Screenshot failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;