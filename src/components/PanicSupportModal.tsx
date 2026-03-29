import { useEffect, useState } from 'react';
import { AlertCircle, Phone, ShieldAlert, Wind, X } from 'lucide-react';

interface PanicSupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function PanicSupportModal({ open, onClose }: PanicSupportModalProps) {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setSeconds(60);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  if (!open) return null;

  const checkInMessage = 'I feel anxious right now. Can we check in for a few minutes?';

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(checkInMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-rose-700 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Need support now?
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Take one short reset. You are safe. Go step-by-step.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
            aria-label="Close panic support modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900 inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            5-4-3-2-1 grounding
          </p>
          <p className="text-sm text-rose-800 mt-2">
            Name 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, and 1 thing you taste.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-sm font-semibold text-purple-900 inline-flex items-center gap-2">
            <Wind className="h-4 w-4" />
            60-second calm breathing
          </p>
          <p className="text-xs text-purple-700 mt-1">Inhale 4s, hold 2s, exhale 6s.</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setRunning(true)}
              className="rounded-lg bg-purple-600 text-white text-sm px-3 py-2 hover:bg-purple-700"
            >
              Start
            </button>
            <button
              onClick={() => setRunning(false)}
              className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
            >
              Pause
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setSeconds(60);
              }}
              className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Quick check-in actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(checkInMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 text-white text-sm px-3 py-2 hover:bg-emerald-700"
            >
              WhatsApp someone
            </a>
            <a
              href={`mailto:?subject=Quick check-in&body=${encodeURIComponent(checkInMessage)}`}
              className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-white"
            >
              Email someone
            </a>
            <button
              onClick={copyMessage}
              className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-white"
            >
              {copied ? 'Copied' : 'Copy message'}
            </button>
            <a
              href="https://findahelpline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-rose-300 text-rose-700 text-sm px-3 py-2 hover:bg-rose-100 inline-flex items-center"
            >
              <Phone className="h-4 w-4 mr-2" />
              Find support line
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
