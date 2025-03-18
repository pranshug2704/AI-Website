import React from 'react';
import MobileSidebarToggle from './MobileSidebarToggle';
import { AIModel } from '@/app/types';

interface ChatHeaderProps {
  title: string;
  selectedModel?: AIModel;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  onNewChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  selectedModel,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
}) => {
  // Simplified header with only the mobile sidebar toggle and title
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center">
        <MobileSidebarToggle 
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
        <h2 className="text-lg font-medium text-gray-900 dark:text-white ml-2">
          {title}
        </h2>
        {selectedModel && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            ({selectedModel.name})
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatHeader; 