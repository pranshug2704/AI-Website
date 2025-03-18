'use client';

import dynamic from 'next/dynamic';
import RootLayout from '../../components/RootLayout';

// Import client-side components with dynamic import to avoid server/client mismatch
const ChatPageWithId = dynamic(() => import('./client-page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 pt-16 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600 dark:text-primary-300 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Loading Chat Interface
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we connect to your account...
        </p>
      </div>
    </div>
  )
});

export default function ChatPageWrapper() {
  return (
    <RootLayout>
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
        <ChatPageWithId />
      </div>
    </RootLayout>
  );
} 