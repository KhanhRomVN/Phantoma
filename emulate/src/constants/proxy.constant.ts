/**
 * ------------------------------------------------------------------
 * Proxy Constants
 * ------------------------------------------------------------------
 */

/** First port tried when allocating a MITM proxy session. */
export const PROXY_BASE_PORT = 8081;

/** Port offset between allocation attempts when a port is already taken. */
export const PROXY_PORT_RETRY_STEP = 10;

/** Max number of allocation attempts before a session fails to start. */
export const PROXY_MAX_RETRIES = 5;
