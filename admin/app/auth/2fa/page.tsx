'use client';

import { Suspense } from 'react';
import { TwoFAContent } from './2fa-content';

function TwoFAPageContent() {
  return <TwoFAContent />;
}

export default function TwoFAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2D4F] to-[#0f1d33]">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-[#1B2D4F] border-t-[#C9A052] rounded-full"></div>
        </div>
      </div>
    }>
      <TwoFAPageContent />
    </Suspense>
  );
}
