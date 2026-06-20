/**
 * SSL Pinning Bypass script for Electron/Linux (BoringSSL/Chromium)
 */
export const ELECTRON_SSL_BYPASS_SCRIPT = `
// Electron/Linux SSL Pinning Bypass
// Targets BoringSSL primitives used by Chromium

rpc.exports = {
  init: function(stage) {
    // Helper to hook verification functions
    function hookVerify(name, retval) {
      var matches = [];
      try {
        var resolver = new ApiResolver('module');
        matches = resolver.enumerateMatches('exports:*!' + name);
      } catch (e) {}
      
      if (matches.length === 0) {
        // Fuzzy search
        Process.enumerateModules().forEach(m => {
          if (m.name.includes('libc') || m.name.includes('pthread')) return;
          try {
            m.enumerateExports().forEach(s => {
              if (s.name.indexOf(name) !== -1) matches.push(s);
            });
          } catch(e) {}
        });
      }

      matches.forEach(function(match) {
        try {
          Interceptor.attach(match.address, {
            onEnter: function(args) {
              // Special case: SSL_set_verify / SSL_CTX_set_verify (arg[1] is mode)
              if (match.name.indexOf('set_verify') !== -1) {
                 // SSL_VERIFY_NONE = 0
                 args[1] = ptr(0); 
              }
            },
            onLeave: function(retval_ptr) {
              if (retval !== undefined) {
                retval_ptr.replace(ptr(retval));
              }
            }
          });
        } catch (e) {
          // console.error("[-] Failed to hook " + match.name + ": " + e.message);
        }
      });
    }

    // Target common BoringSSL/OpenSSL/Node.js/GnuTLS/NSS/Curl functions
    const targets = [
      { name: 'SSL_ctx_set_custom_verify', value: 1 },
      { name: 'SSL_set_custom_verify', value: 1 },
      { name: 'SSL_get_verify_result', value: 0 },
      { name: 'SSL_CTX_get_verify_mode', value: 0 },
      { name: 'SSL_set_verify', value: undefined }, // Overridden in onEnter
      { name: 'SSL_CTX_set_verify', value: undefined },
      { name: 'ssl_verify_peer_cert', value: 0 }, // BoringSSL constant for ssl_verify_ok
      { name: 'ssl_crypto_x509_session_verify_cert_chain', value: 1 },
      { name: 'vfy_VerifyCertificate', value: 1 },
      // GnuTLS
      { name: 'gnutls_session_get_verify_cert_status', value: 0 },
      { name: 'gnutls_session_set_verify_cert', value: 0 },
      // NSS
      { name: 'CERT_VerifyCertificateNow', value: 0 },
      { name: 'CERT_PKIXVerifyCert', value: 0 },
      // Curl
      { name: 'curl_easy_setopt', value: undefined }, // We'll handle this in specialized hook
      // Node.js
      { name: '_ZN4node6crypto21VerifyPeerCertificateERKN7ncrypto10SSLPointerEl', value: 1 },
      { name: '_ZN4node6crypto7TLSWrap11VerifyErrorERKN2v820FunctionCallbackInfoINS2_5ValueEEE', value: 0 },
      // BoringSSL / OpenSSL internals
      { name: 'SSL_CTX_set_verify_depth', value: undefined },
      { name: 'SSL_verify_client_post_handshake', value: 1 },
      { name: 'ssl_verify_cert_chain', value: 1 },
      { name: 'ssl_crypto_x509_session_verify_cert_chain', value: 1 }
    ];

    targets.forEach(t => {
      if (t.name === 'curl_easy_setopt') {
         // Special handling for Curl: CURLOPT_SSL_VERIFYPEER = 64
         const curlMatches = [];
         try { curlMatches.push(...(new ApiResolver('module').enumerateMatches('exports:*!curl_easy_setopt'))); } catch(e) {}
         curlMatches.forEach(m => {
           Interceptor.attach(m.address, {
             onEnter: function(args) {
               if (args[1].toInt32() === 64 || args[1].toInt32() === 81) { // VERIFYPEER or VERIFYHOST
                  args[2] = ptr(0);
               }
             }
           });
         });
      } else {
         hookVerify(t.name, t.value);
      }
    });
    
    // Deep scanning for internal symbols in non-stripped modules
    Process.enumerateModules().forEach(m => {
      const name = m.name.toLowerCase();
      if (name.includes('antigravity') || name.includes('ssl') || name.includes('crypto') || name.includes('gnutls') || name.includes('curl')) {
        try {
          const found = [];
          m.enumerateExports().forEach(e => found.push(e));
          try { m.enumerateSymbols().forEach(s => found.push(s)); } catch(e) {}

          found.forEach(s => {
            const lowerName = s.name.toLowerCase();
            if (lowerName.includes('verify') && (lowerName.includes('cert') || lowerName.includes('ssl') || lowerName.includes('peer'))) {
               if (!targets.some(t => t.name === s.name)) {
                  if (lowerName.includes('error')) {
                    hookVerify(s.name, 0);
                  } else {
                    hookVerify(s.name, 1);
                  }
               }
            }
          });
        } catch (err) {}
      }
    });

  }
};
`;

/**
 * Universal SSL Pinning Bypass script for Android
 */
export const SSL_PINNING_BYPASS_SCRIPT = `
// Universal SSL Pinning Bypass for Android
// Supports: OkHttp, TrustManager, SSLContext, Conscrypt, Cronet, and more
// ... (Rest of Android script content)
`;