import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionLevel, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from '../../permissions/types';

// ─── Permission Dialog ────────────────────────────────────────────────────────

const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const DURATION_OPTIONS = [
  { label: 'One time only', value: 0, singleUse: true },
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '10 minutes', value: 600_000 },
  { label: '30 minutes', value: 1_800_000 },
];

export function PermissionDialog() {
  const { pendingRequests, respondToRequest } = usePermissions();

  if (pendingRequests.length === 0) return null;

  const request = pendingRequests[0];
  const risk = RISK_STYLES[request.riskLevel] ?? RISK_STYLES.medium;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 animate-fade-in">
      <div className={`w-full bg-dark-1 rounded-t-2xl border-t ${risk.border} p-4 animate-slide-up max-h-[80vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-full ${risk.bg} flex items-center justify-center`}>
            <span className={`text-lg ${risk.text}`}>
              {request.riskLevel === 'critical' ? '⚠️' : '🔐'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-0">Permission Required</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${risk.bg} ${risk.text}`}>
              {request.riskLevel.toUpperCase()} RISK
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="bg-dark-2 rounded-lg p-3 mb-3 space-y-2">
          <DetailRow label="Agent" value={request.agent} />
          <DetailRow
            label="Permission"
            value={PERMISSION_LABELS[request.level] ?? PermissionLevel[request.level]}
          />
          <DetailRow label="Site" value={request.domain} />
          <DetailRow label="Action" value={request.action} />
          {request.reason && <DetailRow label="Reason" value={request.reason} />}
        </div>

        {/* Description */}
        <p className="text-xs text-dark-4 mb-3">
          {PERMISSION_DESCRIPTIONS[request.level] ?? 'This action requires your approval.'}
        </p>

        {/* Duration Selector + Actions */}
        <PermissionActions
          requestId={request.requestId}
          suggestedDuration={request.suggestedDuration}
          respondToRequest={respondToRequest}
        />

        {/* Remaining count */}
        {pendingRequests.length > 1 && (
          <p className="text-center text-[10px] text-dark-4 mt-2">
            +{pendingRequests.length - 1} more pending
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Permission Actions ───────────────────────────────────────────────────────

function PermissionActions({
  requestId,
  suggestedDuration,
  respondToRequest,
}: {
  requestId: string;
  suggestedDuration: number;
  respondToRequest: (id: string, approved: boolean, duration?: number, singleUse?: boolean) => void;
}) {
  const [selectedDuration, setSelectedDuration] = useState(
    DURATION_OPTIONS.find((d) => d.value === suggestedDuration) ?? DURATION_OPTIONS[2],
  );

  return (
    <div>
      {/* Duration selector */}
      <div className="mb-3">
        <label className="text-[10px] text-dark-4 uppercase tracking-wider mb-1 block">
          Allow for:
        </label>
        <div className="flex flex-wrap gap-1">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedDuration(opt)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                selectedDuration.value === opt.value
                  ? 'bg-nexus-600/20 border-nexus-500 text-nexus-400'
                  : 'border-dark-3 text-dark-4 hover:border-dark-4'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => respondToRequest(requestId, false)}
          className="flex-1 py-2 rounded-lg bg-dark-3 text-surface-3 hover:bg-dark-4 text-sm font-medium transition-colors"
        >
          Deny
        </button>
        <button
          onClick={() =>
            respondToRequest(
              requestId,
              true,
              selectedDuration.value || undefined,
              selectedDuration.singleUse,
            )
          }
          className="flex-1 py-2 rounded-lg bg-nexus-600 text-white hover:bg-nexus-700 text-sm font-medium transition-colors"
        >
          Allow
        </button>
      </div>
    </div>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-dark-4 uppercase tracking-wider min-w-[70px]">
        {label}
      </span>
      <span className="text-xs text-surface-0 capitalize">{value}</span>
    </div>
  );
}
