Java.perform(function () {
  var TrustManagerImpl;

  function hook(cls, method, impl) {
    try {
      var c = Java.use(cls);
      if (c[method]) {
        c[method].overloads.forEach(function (ov) {
          ov.implementation = impl;
        });
      }
    } catch (e) {
      // class/method not present in this app — skip
    }
  }

  // 1) javax.net.ssl.X509TrustManager — accept everything
  try {
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');

    var TrustManager = Java.registerClass({
      name: 'com.phantoma.sslbypass.TrustManager',
      implements: [X509TrustManager],
      methods: {
        checkClientTrusted: function () {},
        checkServerTrusted: function () {},
        getAcceptedIssuers: function () {
          return [];
        },
      },
    });

    var TrustManagers = [TrustManager.$new()];
    var SSLContext_init = SSLContext.init.overload(
      '[Ljavax.net.ssl.KeyManager;',
      '[Ljavax.net.ssl.TrustManager;',
      'java.security.SecureRandom',
    );
    SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {
      SSLContext_init.call(
        this,
        keyManager,
        Java.array('Ljavax.net.ssl.TrustManager;', TrustManagers),
        secureRandom,
      );
    };
  } catch (e) {}

  // 2) OkHttp3 CertificatePinner
  hook('okhttp3.CertificatePinner', 'check', function () {});

  // 3) OkHttp2
  hook('com.squareup.okhttp.CertificatePinner', 'check', function () {});

  // 4) TrustManagerImpl (Conscrypt / Android default) — Android 7+
  try {
    TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
    TrustManagerImpl.checkTrustedRecursive.implementation = function () {
      return Java.use('java.util.ArrayList').$new();
    };
  } catch (e) {}

  // 5) Network Security Config hostname verifier
  hook('javax.net.ssl.HttpsURLConnection', 'setDefaultHostnameVerifier', function (v) {});
  hook('javax.net.ssl.HttpsURLConnection', 'setHostnameVerifier', function (v) {});
});
