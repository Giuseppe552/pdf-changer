let savedRTC: typeof globalThis.RTCPeerConnection | undefined;
let savedWebkitRTC: typeof globalThis.RTCPeerConnection | undefined;
let patched = false;

export function patchWebRTC(): void {
  if (patched) return;
  savedRTC = globalThis.RTCPeerConnection;
  savedWebkitRTC = (globalThis as Record<string, unknown>)
    .webkitRTCPeerConnection as typeof globalThis.RTCPeerConnection | undefined;
  globalThis.RTCPeerConnection = undefined as unknown as typeof RTCPeerConnection;
  (globalThis as Record<string, unknown>).webkitRTCPeerConnection = undefined;
  patched = true;
}

export function restoreWebRTC(): void {
  if (!patched) return;
  if (savedRTC !== undefined) globalThis.RTCPeerConnection = savedRTC;
  if (savedWebkitRTC !== undefined)
    (globalThis as Record<string, unknown>).webkitRTCPeerConnection = savedWebkitRTC;
  patched = false;
}

export function isWebRTCPatched(): boolean {
  return patched;
}
