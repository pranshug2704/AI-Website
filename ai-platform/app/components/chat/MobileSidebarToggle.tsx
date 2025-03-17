import React from 'react';

interface MobileSidebarToggleProps {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}

const MobileSidebarToggle: React.FC<MobileSidebarToggleProps> = ({
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
}) => {
  return (
    <button
      type="button"
      className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <span className="sr-only">
        {isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      </span>
      {!isMobileSidebarOpen ? (
        <svg
          className="h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      ) : (
        <svg
          className="h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  );
};

export default MobileSidebarToggle; 