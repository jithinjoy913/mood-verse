import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="text-center bg-white/90 rounded-2xl px-8 py-10 shadow-2xl border border-white/70">
        <div className="w-24 h-24 mb-5 mx-auto flex items-center justify-center rounded-full bg-purple-50 border border-purple-100">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" aria-label="Loading" />
        </div>
        <h2 className="text-slate-900 text-xl font-semibold">Welcome to Mood Verse</h2>
        <p className="text-slate-600 mt-2">Preparing secure sign-in and realtime mood engine...</p>
        <div className="mt-5 w-52 max-w-full h-2 rounded-full bg-slate-200 overflow-hidden mx-auto">
          <div className="h-full w-1/2 bg-gradient-to-r from-purple-600 to-pink-500 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
