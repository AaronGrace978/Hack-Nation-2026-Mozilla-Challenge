import { useState, useEffect, useCallback } from 'react';
import { ExtMessageType, type ExtMessage, type StateSync, type PermissionResponsePayload } from '../../shared/messages';
import type { PermissionEscalation, PermissionGrant } from '../../permissions/types';
import { sendToBackground, subscribe } from './useAgents';

// ─── Permission Hook ──────────────────────────────────────────────────────────
// Uses the shared port from useAgents so permission requests actually arrive.

export function usePermissions() {
  const [pendingRequests, setPendingRequests] = useState<PermissionEscalation[]>([]);
  const [activeGrants, setActiveGrants] = useState<PermissionGrant[]>([]);

  useEffect(() => {
    const unsub = subscribe((msg: ExtMessage) => {
      if (msg.type === ExtMessageType.PERMISSION_REQUEST) {
        setPendingRequests((prev) => [...prev, msg.payload as PermissionEscalation]);
      }
      if (msg.type === ExtMessageType.STATE_SYNC) {
        const state = msg.payload as StateSync;
        setActiveGrants(state.activeGrants ?? []);
        setPendingRequests(state.pendingPermissions ?? []);
      }
    });

    return unsub;
  }, []);

  const respondToRequest = useCallback(
    (requestId: string, approved: boolean, duration?: number, singleUse?: boolean) => {
      const response: PermissionResponsePayload = {
        requestId,
        approved,
        duration,
        singleUse,
      };
      sendToBackground(ExtMessageType.PERMISSION_RESPONSE, response);
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    },
    [],
  );

  return { pendingRequests, activeGrants, respondToRequest };
}
