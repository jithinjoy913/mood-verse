import React from 'react';

type AppFooterProps = {
  className?: string;
};

export function AppFooter({ className = '' }: AppFooterProps) {
  return (
    <footer className={`w-full text-center text-xs sm:text-sm text-gray-600 ${className}`.trim()}>
      <p className="mb-3">
        Built with care by{' '}
        <span className="font-semibold text-gray-800">Jithin Joy (JJ)</span>
      </p>
      <a
        href="mailto:jithinjoy913@gmail.com?subject=Mood%20Verse%20Feedback"
        className="inline-flex items-center justify-center rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition-colors hover:bg-purple-50 hover:text-purple-800"
      >
        Send Feedback
      </a>
    </footer>
  );
}
