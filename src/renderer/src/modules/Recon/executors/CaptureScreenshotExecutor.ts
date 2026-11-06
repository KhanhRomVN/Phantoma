import { useReconStore } from '../stores/useReconStore';
import { CaptureScreenshotHandler } from '../handler/CaptureScreenshotHandler';
import type { CaptureScreenshotParams } from '../parsers/CaptureScreenshotParser';
import { setLastScreenshotFileId } from './screenshotState';

const handler = new CaptureScreenshotHandler();

export async function executeCaptureScreenshot(
  params: CaptureScreenshotParams,
): Promise<{ success: boolean; output?: string; error?: string; data?: any }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.fullPage);

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
            setLastScreenshotFileId(uploadData.data.file_id);

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
        console.warn('[executeCaptureScreenshot] Upload failed:', uploadErr);
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