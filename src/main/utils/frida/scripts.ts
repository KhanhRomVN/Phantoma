/**
 * SSL Pinning Bypass script for Electron/Linux (BoringSSL/Chromium)
 */
export const ELECTRON_SSL_BYPASS_SCRIPT = `
// Electron/Linux SSL Pinning Bypass with Debug Logging + Anti-Anti-Debug
// Targets BoringSSL primitives used by Chromium

// Write a test file to confirm script is running
function writeTestFile() {
  try {
    var f = new File('/tmp/frida-script-executed.txt', 'w');
    f.write('Script executed at ' + Date.now());
    f.close();
    console.log('[Frida] Test file written to /tmp/frida-script-executed.txt');
  } catch(e) {
    console.log('[Frida] Failed to write test file: ' + e.message);
  }
}

// Use send() for guaranteed output to parent process
function log(msg) {
  console.log('[Frida] ' + msg);
  try {
    send('[Frida] ' + msg);
  } catch(e) {}
}

log('===== ELECTRON SSL BYPASS SCRIPT STARTED =====');
log('PID: ' + Process.id);
log('Process name: ' + Process.name);
log('Architecture: ' + Process.arch);
log('Platform: ' + Process.platform);

// Write test file immediately
writeTestFile();

// ============================================================
// MONITOR: Watch for process exit and network activity
// ============================================================

// Log when the process exits
try {
  Process.setExceptionHandler(function(exception) {
    log('[Monitor] EXCEPTION: ' + exception.message + ' at ' + exception.address);
    log('[Monitor] Stack: ' + exception.stack);
    return true; // Don't block the exception
  });
} catch(e) {
  log('[Monitor] Exception handler setup failed: ' + e.message);
}

// Log when the process is about to exit
try {
  var exitHandler = Module.findExportByName(null, 'exit');
  if (exitHandler) {
    Interceptor.attach(exitHandler, {
      onEnter: function(args) {
        log('[Monitor] ⚠️ process.exit() called with code: ' + args[0]);
        log('[Monitor] Stack trace: ' + Thread.backtrace(this.context, Backtracer.ACCURATE)
            .map(function(x) { return x.toString(); }).join('\\n'));
      }
    });
    log('[Monitor] ✅ exit() hooked');
  }
  var _exitHandler = Module.findExportByName(null, '_exit');
  if (_exitHandler) {
    Interceptor.attach(_exitHandler, {
      onEnter: function(args) {
        log('[Monitor] ⚠️ _exit() called with code: ' + args[0]);
      }
    });
    log('[Monitor] ✅ _exit() hooked');
  }
} catch(e) {
  log('[Monitor] Exit monitor setup failed: ' + e.message);
}

// Log network activity (connect, send, recv)
try {
  var connectPtr = Module.findExportByName(null, 'connect');
  if (connectPtr) {
    Interceptor.attach(connectPtr, {
      onEnter: function(args) {
        try {
          var sockfd = args[0].toInt32();
          var addr = args[1];
          var addrlen = args[2].toInt32();
          log('[Monitor] 🔌 connect() called: sockfd=' + sockfd + ', addrlen=' + addrlen);
        } catch(e) {
          log('[Monitor] connect() logging failed: ' + e.message);
        }
      }
    });
    log('[Monitor] ✅ connect() hooked');
  }

  var sendPtr = Module.findExportByName(null, 'send');
  if (sendPtr) {
    Interceptor.attach(sendPtr, {
      onEnter: function(args) {
        try {
          var sockfd = args[0].toInt32();
          var len = args[2].toInt32();
          if (len > 0) {
            log('[Monitor] 📤 send() called: sockfd=' + sockfd + ', len=' + len);
          }
        } catch(e) {
          // Silently ignore
        }
      }
    });
    log('[Monitor] ✅ send() hooked');
  }

  var recvPtr = Module.findExportByName(null, 'recv');
  if (recvPtr) {
    Interceptor.attach(recvPtr, {
      onEnter: function(args) {
        try {
          var sockfd = args[0].toInt32();
          var len = args[2].toInt32();
          if (len > 0) {
            log('[Monitor] 📥 recv() called: sockfd=' + sockfd + ', len=' + len);
          }
        } catch(e) {
          // Silently ignore
        }
      }
    });
    log('[Monitor] ✅ recv() hooked');
  }
} catch(e) {
  log('[Monitor] Network monitor setup failed: ' + e.message);
}

// Log loaded libraries (look for SSL/crypto libraries)
log('[Monitor] Enumerating loaded modules for SSL libraries...');
Process.enumerateModules().forEach(function(m) {
  var name = m.name.toLowerCase();
  if (name.includes('ssl') || name.includes('crypto') || name.includes('gnutls') || 
      name.includes('nss') || name.includes('libcurl') || name.includes('cert')) {
    log('[Monitor] Found SSL library: ' + m.name + ' at ' + m.base);
  }
});

// ============================================================
// ANTI-ANTI-DEBUG: Bypass Frida detection (Enhanced for Electron)
// ============================================================

log('[AntiDebug] Installing anti-anti-debug hooks...');

// Helper to patch /proc/self/status TracerPid
function patchTracerPid(buffer, size) {
  try {
    var str = buffer.readCString(size);
    if (str && str.indexOf('TracerPid:') !== -1) {
      var patched = str.replace(/TracerPid:\\s*\\d+/, 'TracerPid:\\t0');
      buffer.writeUtf8String(patched);
      log('[AntiDebug] Patched TracerPid in status read');
      return true;
    }
  } catch(e) {}
  return false;
}

// Hook fopen/fopen64 to intercept /proc/self/status
try {
  var fopenPtr = Module.findExportByName(null, 'fopen');
  if (fopenPtr) {
    Interceptor.attach(fopenPtr, {
      onEnter: function(args) {
        try {
          var path = args[0].readCString();
          if (path && path.indexOf('/proc/self/status') !== -1) {
            log('[AntiDebug] fopen(/proc/self/status) intercepted');
            this.isStatusFile = true;
          }
        } catch(e) {}
      }
    });
    log('[AntiDebug] ✅ fopen() hooked');
  }
} catch(e) {
  log('[AntiDebug] fopen hook failed: ' + e.message);
}

// Hook fread to patch TracerPid when reading /proc/self/status
try {
  var freadPtr = Module.findExportByName(null, 'fread');
  if (freadPtr) {
    Interceptor.attach(freadPtr, {
      onEnter: function(args) {
        this.buffer = args[0];
        this.size = args[1].toInt32() * args[2].toInt32();
      },
      onLeave: function(retval) {
        if (this.buffer && retval.toInt32() > 0) {
          try {
            patchTracerPid(this.buffer, this.size);
          } catch(e) {}
        }
      }
    });
    log('[AntiDebug] ✅ fread() hooked');
  }
} catch(e) {
  log('[AntiDebug] fread hook failed: ' + e.message);
}

// Hook open to intercept /proc/self/status and hide Frida
try {
  var openPtr = Module.findExportByName(null, 'open');
  if (openPtr) {
    Interceptor.attach(openPtr, {
      onEnter: function(args) {
        try {
          var path = args[0].readCString();
          if (path && path.indexOf('/proc/') !== -1 && path.indexOf('status') !== -1) {
            log('[AntiDebug] open(/proc/.../status) intercepted: ' + path);
            this.isStatusFile = true;
          }
          // Hide Frida files
          if (path && (path.indexOf('frida') !== -1 || path.indexOf('gum-js') !== -1 || 
                       path.indexOf('linjector') !== -1 || path.indexOf('re.frida') !== -1)) {
            log('[AntiDebug] Hiding Frida file: ' + path);
            this.hideFrida = true;
          }
        } catch(e) {}
      },
      onLeave: function(retval) {
        if (this.hideFrida) {
          retval.replace(ptr(-1));
        }
      }
    });
    log('[AntiDebug] ✅ open() hooked');
  }
} catch(e) {
  log('[AntiDebug] open hook failed: ' + e.message);
}

// Hook stat/stat64 to hide Frida files
try {
  var statPtr = Module.findExportByName(null, 'stat');
  if (statPtr) {
    Interceptor.attach(statPtr, {
      onEnter: function(args) {
        try {
          var path = args[0].readCString();
          if (path && (path.indexOf('frida') !== -1 || path.indexOf('gum-js') !== -1 || 
                       path.indexOf('linjector') !== -1 || path.indexOf('re.frida') !== -1)) {
            log('[AntiDebug] stat() hiding Frida file: ' + path);
            this.hideFrida = true;
          }
        } catch(e) {}
      },
      onLeave: function(retval) {
        if (this.hideFrida) {
          retval.replace(ptr(-1));
        }
      }
    });
    log('[AntiDebug] ✅ stat() hooked');
  }
} catch(e) {
  log('[AntiDebug] stat hook failed: ' + e.message);
}

// Hook read to patch TracerPid in /proc/self/status
try {
  var readPtr = Module.findExportByName(null, 'read');
  if (readPtr) {
    Interceptor.attach(readPtr, {
      onEnter: function(args) {
        this.buffer = args[1];
        this.count = args[2].toInt32();
        this.fd = args[0].toInt32();
      },
      onLeave: function(retval) {
        if (this.buffer && retval.toInt32() > 0) {
          try {
            patchTracerPid(this.buffer, this.count);
          } catch(e) {}
        }
      }
    });
    log('[AntiDebug] ✅ read() hooked');
  }
} catch(e) {
  log('[AntiDebug] read hook failed: ' + e.message);
}

// Hook ptrace to bypass detection

// 1. Hook functions that check for TracerPid in /proc/self/status
// Common anti-debug: read /proc/self/status and check TracerPid
function hookFileReads() {
  try {
    // Hook open/openat to intercept /proc/self/status reads
    var openPtr = Module.findExportByName(null, 'open');
    var openatPtr = Module.findExportByName(null, 'openat');
    
    if (openPtr) {
      Interceptor.attach(openPtr, {
        onEnter: function(args) {
          try {
            var path = args[0].readCString();
            if (path && (path.indexOf('/proc/self/status') !== -1 || 
                         path.indexOf('/proc/') !== -1 && path.indexOf('status') !== -1)) {
              log('[AntiDebug] Intercepted open of: ' + path);
              this.isStatusFile = true;
            }
          } catch(e) {}
        },
        onLeave: function(retval) {
          if (this.isStatusFile) {
            // We'll handle this in read hook
            this.statusFd = retval.toInt32();
          }
        }
      });
    }

    // Hook read to modify TracerPid in /proc/self/status
    var readPtr = Module.findExportByName(null, 'read');
    if (readPtr) {
      Interceptor.attach(readPtr, {
        onEnter: function(args) {
          this.fd = args[0].toInt32();
          this.buf = args[1];
          this.count = args[2].toInt32();
        },
        onLeave: function(retval) {
          if (this.fd > 0 && this.buf && retval.toInt32() > 0) {
            try {
              var data = this.buf.readCString(retval.toInt32());
              if (data && data.indexOf('TracerPid:') !== -1) {
                var modified = data.replace(/TracerPid:\\s*\\d+/, 'TracerPid:\\t0');
                this.buf.writeUtf8String(modified);
                log('[AntiDebug] Patched TracerPid in status read');
              }
            } catch(e) {}
          }
        }
      });
    }
  } catch(e) {
    log('[AntiDebug] File read hooks failed: ' + e.message);
  }
}

// 2. Hook ptrace to prevent detection
function hookPtrace() {
  try {
    var ptracePtr = Module.findExportByName(null, 'ptrace');
    if (ptracePtr) {
      Interceptor.attach(ptracePtr, {
        onEnter: function(args) {
          // PTRACE_TRACEME = 0
          if (args[0].toInt32() === 0) {
            log('[AntiDebug] Intercepted ptrace(PTRACE_TRACEME)');
            // Return 0 (success) to pretend tracing is already active
            this.bypass = true;
          }
        },
        onLeave: function(retval) {
          if (this.bypass) {
            retval.replace(ptr(0));
            log('[AntiDebug] ptrace bypassed');
          }
        }
      });
    }
  } catch(e) {
    log('[AntiDebug] ptrace hook failed: ' + e.message);
  }
}

// 3. Hook isDebuggerAttached / debugger checks
function hookDebuggerChecks() {
  try {
    // Common Node.js debugger check: process._getActiveHandles()
    // Hook process._getActiveHandles to return empty if called from debugger
    var getActiveHandles = Module.findExportByName(null, '_ZN4node13GetActiveHandlesERKN2v820FunctionCallbackInfoINS1_5ValueEEE');
    if (getActiveHandles) {
      Interceptor.attach(getActiveHandles, {
        onEnter: function(args) {
          log('[AntiDebug] Intercepted _GetActiveHandles');
        },
        onLeave: function(retval) {
          // Return empty array
          // This is tricky in Frida; we'll just log for now
        }
      });
    }
  } catch(e) {
    log('[AntiDebug] Debugger check hooks failed: ' + e.message);
  }
}

// 4. Hook exit/abort to prevent process termination
function hookExit() {
  try {
    var exitPtr = Module.findExportByName(null, 'exit');
    var abortPtr = Module.findExportByName(null, 'abort');
    var _exitPtr = Module.findExportByName(null, '_exit');
    
    [exitPtr, abortPtr, _exitPtr].forEach(function(ptr) {
      if (ptr) {
        Interceptor.attach(ptr, {
          onEnter: function(args) {
            log('[AntiDebug] ⚠️ process.exit() called with code: ' + args[0]);
            // Log stack trace to see who called exit
            log('[AntiDebug] Stack trace: ' + Thread.backtrace(this.context, Backtracer.ACCURATE)
                .map(function(x) { return x.toString(); }).join('\\n'));
            // Prevent exit by redirecting to a loop
            // We can't fully prevent exit, but we can log it
          }
        });
      }
    });
  } catch(e) {
    log('[AntiDebug] Exit hooks failed: ' + e.message);
  }
}

// 5. Hook dlopen to detect if app tries to load anti-debug libraries
function hookDlopen() {
  try {
    var dlopenPtr = Module.findExportByName(null, 'dlopen');
    if (dlopenPtr) {
      Interceptor.attach(dlopenPtr, {
        onEnter: function(args) {
          try {
            var path = args[0].readCString();
            if (path) {
              log('[AntiDebug] dlopen: ' + path);
              // Check for suspicious libraries
              if (path.indexOf('frida') !== -1 || 
                  path.indexOf('gum') !== -1 ||
                  path.indexOf('linjector') !== -1) {
                log('[AntiDebug] ⚠️ App is trying to load Frida-related library: ' + path);
              }
            }
          } catch(e) {}
        }
      });
    }
  } catch(e) {
    log('[AntiDebug] dlopen hook failed: ' + e.message);
  }
}

// 6. Hook file existence checks (access, stat) for Frida files
function hookFileChecks() {
  try {
    var accessPtr = Module.findExportByName(null, 'access');
    var statPtr = Module.findExportByName(null, 'stat');
    var stat64Ptr = Module.findExportByName(null, 'stat64');
    
    [accessPtr, statPtr, stat64Ptr].forEach(function(ptr) {
      if (ptr) {
        Interceptor.attach(ptr, {
          onEnter: function(args) {
            try {
              var path = args[0].readCString();
              if (path && (path.indexOf('frida') !== -1 || 
                           path.indexOf('gum-js') !== -1 ||
                           path.indexOf('linjector') !== -1)) {
                log('[AntiDebug] Intercepted file check for: ' + path);
                this.bypass = true;
              }
            } catch(e) {}
          },
          onLeave: function(retval) {
            if (this.bypass) {
              // Return -1 (file not found) to hide Frida files
              retval.replace(ptr(-1));
              log('[AntiDebug] File check bypassed (returned -1)');
            }
          }
        });
      }
    });
  } catch(e) {
    log('[AntiDebug] File check hooks failed: ' + e.message);
  }
}

// 7. Hook getpid to prevent process ID checks
function hookGetpid() {
  try {
    var getpidPtr = Module.findExportByName(null, 'getpid');
    if (getpidPtr) {
      Interceptor.attach(getpidPtr, {
        onEnter: function() {
          this.called = true;
        },
        onLeave: function(retval) {
          if (this.called) {
            log('[AntiDebug] getpid called, returning: ' + retval);
          }
        }
      });
    }
  } catch(e) {
    log('[AntiDebug] getpid hook failed: ' + e.message);
  }
}

// Install all anti-debug hooks
try {
  hookFileReads();
  hookPtrace();
  hookDebuggerChecks();
  hookExit();
  hookDlopen();
  hookFileChecks();
  hookGetpid();
  log('[AntiDebug] ✅ All anti-debug hooks installed');
} catch(e) {
  log('[AntiDebug] ❌ Failed to install anti-debug hooks: ' + e.message);
}

// ============================================================
// SSL Bypass code continues below
// ============================================================

rpc.exports = {
  init: function(stage) {
    log('===== INIT CALLED (stage=' + stage + ') =====');
    
    // Helper to hook verification functions
    function hookVerify(name, retval) {
      log('Attempting to hook: ' + name);
      var matches = [];
      try {
        var resolver = new ApiResolver('module');
        matches = resolver.enumerateMatches('exports:*!' + name);
        log('ApiResolver found ' + matches.length + ' matches for ' + name);
      } catch (e) {
        log('ApiResolver failed for ' + name + ': ' + e.message);
      }
      
      if (matches.length === 0) {
        log('No ApiResolver matches, trying fuzzy search for ' + name);
        Process.enumerateModules().forEach(m => {
          if (m.name.includes('libc') || m.name.includes('pthread')) return;
          try {
            var exports = m.enumerateExports();
            for (var i = 0; i < exports.length; i++) {
              if (exports[i].name.indexOf(name) !== -1) {
                matches.push(exports[i]);
                log('Fuzzy match: ' + exports[i].name + ' in ' + m.name);
              }
            }
          } catch(e) {
            log('Error enumerating ' + m.name + ': ' + e.message);
          }
        });
      }

      log('Total matches for ' + name + ': ' + matches.length);
      if (matches.length === 0) {
        log('⚠️ No matches found for ' + name);
        return;
      }

      matches.forEach(function(match, idx) {
        try {
          log('Hooking ' + match.name + ' at ' + match.address);
          Interceptor.attach(match.address, {
            onEnter: function(args) {
              log('🔵 ' + match.name + ' called');
              // Special case: SSL_set_verify / SSL_CTX_set_verify (arg[1] is mode)
              if (match.name.indexOf('set_verify') !== -1) {
                 log('  Setting verify mode to SSL_VERIFY_NONE (0)');
                 args[1] = ptr(0); 
              }
              // Log arguments for debugging
              try {
                log('  args[0]=' + args[0] + ', args[1]=' + args[1] + ', args[2]=' + args[2]);
              } catch(e) {
                log('  Could not log args: ' + e.message);
              }
            },
            onLeave: function(retval_ptr) {
              if (retval !== undefined) {
                log('🟢 ' + match.name + ' returning ' + retval + ' -> patching to ' + retval);
                retval_ptr.replace(ptr(retval));
              } else {
                log('🟢 ' + match.name + ' returned (no patch)');
              }
            }
          });
          log('✅ Successfully hooked ' + match.name);
        } catch (e) {
          log('❌ Failed to hook ' + match.name + ': ' + e.message);
        }
      });
    }

    log('Enumerating loaded modules...');
    var moduleNames = [];
    Process.enumerateModules().forEach(function(m) {
      moduleNames.push(m.name + ' (' + m.path + ')');
    });
    log('Loaded modules: ' + moduleNames.join(', '));

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

    log('Processing ' + targets.length + ' target functions...');
    targets.forEach(function(t, idx) {
      log('[' + (idx+1) + '/' + targets.length + '] Processing ' + t.name);
      if (t.name === 'curl_easy_setopt') {
         // Special handling for Curl: CURLOPT_SSL_VERIFYPEER = 64
         log('Special handling for curl_easy_setopt');
         var curlMatches = [];
         try { 
           var resolver = new ApiResolver('module');
           curlMatches = resolver.enumerateMatches('exports:*!curl_easy_setopt');
           log('curl_easy_setopt matches: ' + curlMatches.length);
         } catch(e) {
           log('curl_easy_setopt ApiResolver failed: ' + e.message);
         }
         curlMatches.forEach(function(m) {
           try {
             log('Hooking curl_easy_setopt at ' + m.address);
             Interceptor.attach(m.address, {
               onEnter: function(args) {
                 var option = args[1].toInt32();
                 log('🔵 curl_easy_setopt option=' + option);
                 if (option === 64 || option === 81) { // VERIFYPEER or VERIFYHOST
                    log('  Setting SSL verification to 0');
                    args[2] = ptr(0);
                 }
               },
               onLeave: function(retval) {
                 log('🟢 curl_easy_setopt returned');
               }
             });
           } catch(e) {
             log('❌ Failed to hook curl_easy_setopt: ' + e.message);
           }
         });
      } else {
         hookVerify(t.name, t.value);
      }
    });
    
    // Deep scanning for internal symbols in non-stripped modules
    log('Deep scanning for SSL/crypto symbols...');
    Process.enumerateModules().forEach(function(m) {
      var name = m.name.toLowerCase();
      if (name.includes('antigravity') || name.includes('ssl') || name.includes('crypto') || 
          name.includes('gnutls') || name.includes('curl') || name.includes('node')) {
        log('Scanning module: ' + m.name);
        try {
          var found = [];
          m.enumerateExports().forEach(function(e) { found.push(e); });
          try { m.enumerateSymbols().forEach(function(s) { found.push(s); }); } catch(e) {}

          log('Found ' + found.length + ' exports/symbols in ' + m.name);
          var hookedCount = 0;
          found.forEach(function(s) {
            var lowerName = s.name.toLowerCase();
            if (lowerName.includes('verify') && (lowerName.includes('cert') || lowerName.includes('ssl') || lowerName.includes('peer'))) {
               if (!targets.some(function(t) { return t.name === s.name; })) {
                  log('Deep scan found: ' + s.name + ' in ' + m.name);
                  try {
                    if (lowerName.includes('error')) {
                      hookVerify(s.name, 0);
                    } else {
                      hookVerify(s.name, 1);
                    }
                    hookedCount++;
                  } catch(e) {
                    log('Failed to hook deep scan symbol ' + s.name + ': ' + e.message);
                  }
               }
            }
          });
          log('Hooked ' + hookedCount + ' symbols from ' + m.name);
        } catch (err) {
          log('Error scanning ' + m.name + ': ' + err.message);
        }
      }
    });

    log('===== INIT COMPLETE =====');
  }
};

// Auto-initialize with a small delay to ensure modules are loaded
log('Scheduling init in 500ms...');
setTimeout(function() {
  log('Auto-initializing...');
  try {
    rpc.exports.init('auto');
  } catch(e) {
    log('Auto-init failed: ' + e.message);
  }
}, 500);
`;

/**
 * Universal SSL Pinning Bypass script for Android
 */
export const SSL_PINNING_BYPASS_SCRIPT = `
// Universal SSL Pinning Bypass for Android
// Supports: OkHttp, TrustManager, SSLContext, Conscrypt, Cronet, and more
// ... (Rest of Android script content)
`;