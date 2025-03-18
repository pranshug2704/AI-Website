'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  
  // Use authentication context
  const { user, logout } = useAuth()

  useEffect(() => {
    // Check for dark mode preference
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('darkMode') === 'true' || 
        (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setIsDarkMode(isDark)
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newMode))
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }
  
  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-[100]">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
          AI Platform
        </Link>
        
        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          <Link 
            href="/" 
            className={`${
              pathname === '/' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            Home
          </Link>
          
          <Link 
            href="/chat" 
            className={`${
              pathname === '/chat' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            Chat
          </Link>
          
          <Link 
            href="/pricing" 
            className={`${
              pathname === '/pricing' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            Pricing
          </Link>
          
          <Link 
            href="/api-access" 
            className={`${
              pathname === '/api-access' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            API Access
          </Link>
          
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative z-10 flex items-center text-sm p-2 rounded-full focus:outline-none"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-white">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="ml-2 hidden sm:block">
                  {user.name || user.email}
                </span>
                <svg
                  className="ml-1 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="py-1">
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Your Profile
                    </a>
                    <a
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      API Keys & Settings
                    </a>
                    <a
                      href="/api-access"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      API Access
                    </a>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link 
                href="/login" 
                className={`${
                  pathname === '/login' 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
          
          <button
            onClick={toggleDarkMode}
            className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className="text-gray-700 dark:text-gray-300 p-2"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-700 dark:text-gray-300 p-2"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="container flex flex-col space-y-4">
            {user && (
              <div className="py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            <Link 
              href="/" 
              className={`block ${
                pathname === '/' 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            <Link 
              href="/chat" 
              className={`block ${
                pathname === '/chat' 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Chat
            </Link>
            
            <Link 
              href="/pricing" 
              className={`block ${
                pathname === '/pricing' 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            
            <Link 
              href="/api-access" 
              className={`block ${
                pathname === '/api-access' 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              API Access
            </Link>
            
            {user ? (
              <>
                <Link 
                  href="/profile" 
                  className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Your Profile
                </Link>
                <Link 
                  href="/settings" 
                  className="block text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`block ${
                    pathname === '/login' 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="btn btn-primary w-full text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}