import { ipcMain } from 'electron';

export function setupTLSHandlers() {
  ipcMain.handle('tls:scan', async (_, host: string) => {
    const tls = await import('tls');
    return new Promise((resolve) => {
      const result: Record<string, any> = {};
      const socket = tls.connect(443, host, { servername: host, rejectUnauthorized: false }, () => {
        result.protocol = socket.getProtocol();
        result.cipher = socket.getCipher();
        const cert = socket.getPeerCertificate(false);
        if (cert) {
          result.cert = {
            subject: cert.subject,
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            bits: (cert as any).bits,
            fingerprint: cert.fingerprint,
            fingerprint256: cert.fingerprint256,
            serialNumber: cert.serialNumber,
            subjectaltname: (cert as any).subjectaltname,
            infoAccess: (cert as any).infoAccess
              ? JSON.stringify((cert as any).infoAccess)
              : undefined,
            ext_key_usage: (cert as any).ext_key_usage,
          };
          result.selfSigned =
            cert.subject?.CN === cert.issuer?.CN && cert.subject?.O === cert.issuer?.O;
        }
        socket.destroy();
        resolve(result);
      });
      socket.on('error', (err) => resolve({ error: err.message }));
      socket.setTimeout(6000, () => {
        socket.destroy();
        resolve({ error: 'timeout' });
      });
    });
  });
}