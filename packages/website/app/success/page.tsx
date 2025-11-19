'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const source = searchParams.get('source');
  const returnTo = searchParams.get('return_to');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (source === 'extension' && returnTo) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            window.location.href = returnTo;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [source, returnTo]);

  if (source === 'extension') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">Payment Successful!</h1>
          <p className="text-lg text-gray-600 mb-6">Your Pro subscription is now active.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              Returning to extension in <span className="font-semibold text-xl">{countdown}</span>{' '}
              {countdown === 1 ? 'second' : 'seconds'}...
            </p>
          </div>
          <button
            onClick={() => returnTo && (window.location.href = returnTo)}
            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
          >
            Return to Extension Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">Welcome to Pro!</h1>
        <p className="text-xl text-gray-600 mb-8">Your subscription is now active.</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            Return Home
          </button>
          <button
            onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
          >
            Get Extension
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
