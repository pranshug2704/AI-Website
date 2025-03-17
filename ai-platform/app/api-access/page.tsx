'use client';

import Link from 'next/link';

export default function ApiAccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 pb-24">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              API Access
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Integrate our powerful AI models directly into your applications through our easy-to-use API
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              To use our API, you'll need an API key. Sign up for an account and subscribe to a plan to get your API key.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link 
                href="/signup" 
                className="btn btn-primary px-6 py-3 text-center"
              >
                Sign Up for API Access
              </Link>
              <Link 
                href="/login" 
                className="btn btn-secondary px-6 py-3 text-center"
              >
                Log In to View API Key
              </Link>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Base URL
              </h3>
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 font-mono text-sm overflow-x-auto">
                https://api.aiplatform.example/v1
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Documentation</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Comprehensive API documentation with examples in multiple programming languages.
              </p>
              <Link href="/docs" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                View Documentation →
              </Link>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Code Samples</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Ready-to-use code snippets in JavaScript, Python, Ruby, and more.
              </p>
              <Link href="/examples" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                View Examples →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}