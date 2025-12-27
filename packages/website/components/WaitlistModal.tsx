'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mail, CheckCircle2 } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      // Simple mailto approach for MVP - no backend needed
      const subject = encodeURIComponent('Notify me when Bookmark Assistant launches!');
      const body = encodeURIComponent(
        `Hi,\n\nPlease notify me when Bookmark Assistant is available on Chrome Web Store.\n\nEmail: ${email}\n\nThanks!`
      );

      // Open mailto link
      window.location.href = `mailto:aries0331.dev@gmail.com?subject=${subject}&body=${body}`;

      // Show success after a short delay
      setTimeout(() => {
        setStatus('success');
      }, 500);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {status === 'success' ? (
          // Success state
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">You're on the list!</h3>
            <p className="text-gray-600 mb-6">
              We'll email you as soon as Bookmark Assistant launches on Chrome Web Store.
            </p>
            <p className="text-sm text-gray-500">
              Expected launch: <strong>Early January 2026</strong>
            </p>
            <Button onClick={onClose} className="mt-6" variant="secondary">
              Close
            </Button>
          </div>
        ) : (
          // Form state
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Join the Waitlist</h3>
              <p className="text-gray-600">
                We're currently under Chrome Web Store review.
                <br />
                Be the first to know when we launch!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="waitlist-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    status === 'error' ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                  disabled={status === 'submitting'}
                />
                {status === 'error' && errorMessage && (
                  <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
                )}
              </div>

              <Button type="submit" fullWidth disabled={status === 'submitting'} className="!mt-4">
                {status === 'submitting' ? 'Submitting...' : 'Notify Me When Available'}
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              🚀 Expected launch: Early January 2026
            </p>
          </>
        )}
      </div>
    </div>
  );
}
