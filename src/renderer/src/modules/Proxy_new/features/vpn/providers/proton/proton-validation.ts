const ENDPOINT_RE = /^[^\s:]+:\d{1,5}$/;

export function isValidEndpoint(endpoint: string): boolean {
  return ENDPOINT_RE.test(endpoint.trim());
}

// ASSUMED: endpoint is also required — the backend needs host:port to build the wireproxy config
export function isProtonFormValid(f: { email: string; privateKey: string; peerKey: string; endpoint: string }): boolean {
  return Boolean(f.email.trim() && f.privateKey.trim() && f.peerKey.trim() && isValidEndpoint(f.endpoint));
}
