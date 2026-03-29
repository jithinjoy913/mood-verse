import React from 'react';
import { exportLocalAnalyticsLog } from '../services/analytics';

type PrivacyCenterModalProps = {
  open: boolean;
  onClose: () => void;
};

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportPrivacyData() {
  const localData: Record<string, string | null> = {};
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    localStorage: localData,
    analyticsLog: JSON.parse(exportLocalAnalyticsLog())
  };

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.startsWith('moodverse_')) {
        localData[key] = window.localStorage.getItem(key);
      }
    }
  } catch {
    // Ignore if localStorage access is blocked.
  }

  downloadTextFile('moodverse-privacy-export.json', JSON.stringify(payload, null, 2));
}

function clearMoodVerseLocalData() {
  const keysToRemove: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.startsWith('moodverse_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}

export function PrivacyCenterModal({ open, onClose }: PrivacyCenterModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-900">Privacy Center</h2>
        <p className="text-sm text-gray-600 mt-2">
          Export or clear locally stored mood preferences and anonymous app interaction logs on this device.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={exportPrivacyData}
            className="rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-3 hover:bg-indigo-100"
          >
            Export Local Data
          </button>
          <button
            onClick={() => {
              clearMoodVerseLocalData();
            }}
            className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium px-4 py-3 hover:bg-rose-100"
          >
            Clear Local Data
          </button>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
