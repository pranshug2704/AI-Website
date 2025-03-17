'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoResponse, setDemoResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const router = useRouter();

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!demoPrompt.trim()) return;
    
    setIsTyping(true);
    
    // Generate a response based on the prompt
    let response = '';
    if (demoPrompt.toLowerCase().includes('ai') || demoPrompt.toLowerCase().includes('model')) {
      response = "Our platform intelligently routes your requests to the most appropriate AI model based on the task type, complexity, and your subscription tier. This means you get the optimal balance of performance and cost for every query.";
    } else if (demoPrompt.toLowerCase().includes('pricing') || demoPrompt.toLowerCase().includes('cost')) {
      response = "We offer flexible pricing plans starting from free tier with basic models, to Pro ($29/month) with advanced models, and Enterprise plans with full access to all models. You can find more details on our Pricing page.";
    } else if (demoPrompt.toLowerCase().includes('hello') || demoPrompt.toLowerCase().includes('hi')) {
      response = "Hello! I'm a demo of the AI Platform. How can I assist you today? Ask me about our services, AI models, or pricing!";
    } else {
      response = "Thanks for your question! This is a demo of our AI Platform. In the full version, you'll get accurate, helpful responses from multiple AI models based on your subscription tier. Sign up today to start exploring!";
    }
    
    // Simulate typing effect
    let currentText = '';
    const interval = setInterval(() => {
      if (currentText.length < response.length) {
        currentText = response.slice(0, currentText.length + 1);
        setDemoResponse(currentText);
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 20);
    
    return () => clearInterval(interval);
  };

  const handleFullChat = () => {
    router.push('/chat');
  };
  return (
    <section className="relative py-20 overflow-hidden bg-white dark:bg-gray-900">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 opacity-70"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>
      
      <div className="container relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
              <span className="text-primary-600 dark:text-primary-400">Access Multiple AI Models</span>{' '}
              in One Place
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
              Our platform intelligently distributes workloads across AI models based on your needs and subscription tier.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/chat" className="btn btn-primary text-lg px-8 py-3 relative overflow-hidden group">
                <span className="absolute -inset-x-3 top-0 h-[2px] bg-white/30 group-hover:animate-[move_1s_ease-in-out_infinite]"></span>
                Try AI Chat
              </Link>
              <Link href="/pricing" className="btn btn-secondary text-lg px-8 py-3 transition-transform hover:scale-105">
                View Pricing
              </Link>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <div className="w-full aspect-square max-w-md mx-auto relative">
              {/* Chat interface mockup */}
              <div className="bg-gradient-to-tr from-primary-600 to-purple-600 dark:from-primary-800 dark:to-purple-800 w-full h-full rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-white dark:bg-gray-900 m-2 rounded-xl h-[calc(100%-1rem)] flex flex-col">
                  {/* Chat header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                        </svg>
                      </div>
                      <div className="font-medium">AI Chat</div>
                    </div>
                    <div className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 text-gray-600 dark:text-gray-300">
                      GPT-4o
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-3 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200 max-w-[80%]">
                        {demoPrompt || "How can your AI select the best model for my tasks?"}
                      </div>
                    </div>
                    
                    <div className="flex items-start justify-end">
                      <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-3 text-sm text-primary-800 dark:text-primary-100 max-w-[80%]">
                        {demoResponse || "Our platform analyzes your request and routes it to the most suitable AI model based on factors like task type, complexity, and your subscription tier."}
                        {isTyping && <span className="inline-block ml-1 animate-pulse">▌</span>}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-300 ml-3 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <form onSubmit={handleDemoSubmit} className="flex items-center">
                      <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <input 
                          type="text" 
                          value={demoPrompt}
                          onChange={(e) => setDemoPrompt(e.target.value)}
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200" 
                          placeholder="Try asking something..." 
                          disabled={isTyping}
                        />
                        <button 
                          type="submit"
                          disabled={isTyping}
                          className="ml-2 text-primary-600 dark:text-primary-400 transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </form>
                    <div className="mt-3 text-center">
                      <button
                        onClick={handleFullChat}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                      >
                        Try the full experience →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700 rounded-xl shadow-lg -z-10"></div>
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-tr from-primary-400 to-blue-500 dark:from-primary-600 dark:to-blue-700 rounded-lg shadow-lg -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}