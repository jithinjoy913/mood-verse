import React from 'react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-purple-500 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-24 h-24 mb-4 mx-auto">
          <img
            src="https://raw.githubusercontent.com/n3r4zzurr0/svg-spinners/main/preview/90-ring-with-bg-white.svg"
            alt="Loading..."
            className="w-full h-full"
          />
        </div>
        <h2 className="text-white text-xl font-semibold">Welcome to Mood Verse</h2>
        <p className="text-purple-100 mt-2">Getting everything ready for you...</p>
      </div>
    </div>
  );
}