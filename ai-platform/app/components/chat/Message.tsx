'use client';

import React, { useState } from 'react';
import { Message as MessageType, ImageContent } from '@/app/types';
import { formatTokenCount } from '@/app/lib/tokens';
import { getModelById } from '@/app/lib/models';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-md overflow-hidden bg-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-800 text-xs text-white">
        <span>{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-1 text-xs text-gray-200 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

interface ImageDisplayProps {
  image: ImageContent;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ image }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-4 rounded-md overflow-hidden">
      <div className={`relative ${isExpanded ? 'max-w-full' : 'max-w-sm'} transition-all duration-300`}>
        <img 
          src={image.url || `data:${image.mimeType};base64,${image.data}`} 
          alt={image.alt || 'Attached image'} 
          className={`rounded-md object-contain cursor-pointer ${isExpanded ? 'max-h-[600px]' : 'max-h-[300px]'}`}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: image.width ? `${image.width}px` : 'auto',
            height: image.height ? `${image.height}px` : 'auto',
          }}
        />
        <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white p-1"
            title={isExpanded ? "Shrink image" : "Expand image"}
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MessageProps {
  message: MessageType;
}

const processMarkdownContent = (content: string): string => {
  if (!content) return '';
  
  // Trim the content
  let processed = content.trim();
  
  // Replace more than 2 consecutive newlines with just 2
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Replace a newline followed by whitespace and another newline with just 2 newlines
  processed = processed.replace(/\n\s*\n/g, '\n\n');
  
  // Fix numbered lists with too much spacing - look for patterns like "1.\n\nText"
  processed = processed.replace(/(\d+\.)\s*\n\s*\n\s*/g, '$1 ');
  
  // Fix bullet lists with too much spacing
  processed = processed.replace(/([•*-])\s*\n\s*\n\s*/g, '$1 ');
  
  // Normalize whitespace around headings
  processed = processed.replace(/\n\s*\n\s*(#{1,6})\s+/g, '\n\n$1 ');
  
  // Fix extra blank lines before lists
  processed = processed.replace(/\n\n(\d+\.\s)/g, '\n$1');
  processed = processed.replace(/\n\n([•*-]\s)/g, '\n$1');
  
  // Normalize whitespace after list markers
  processed = processed.replace(/(\d+\.)\s{2,}/g, '$1 ');
  processed = processed.replace(/([•*-])\s{2,}/g, '$1 ');
  
  return processed;
};

const Message: React.FC<MessageProps> = ({ message }) => {
  // Get model info if available
  const model = message.modelId ? getModelById(message.modelId) : null;

  // Determine content type
  const contentType = message.contentType || 'text';

  return (
    <div 
      className={`p-4 ${
        message.role === 'user' 
          ? 'bg-gray-100 dark:bg-gray-800 border-l-4 border-primary-500' 
          : message.role === 'assistant'
            ? 'bg-white dark:bg-gray-900'
            : message.role === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-l-4 border-red-500'
              : 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 italic text-sm'
      }`}
    >
      <div className="flex items-start">
        <div 
          className={`w-8 h-8 rounded-full mr-4 flex items-center justify-center flex-shrink-0 ${
            message.role === 'user'
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
              : message.role === 'assistant'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300'
                : message.role === 'error'
                  ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
          }`}
        >
          {message.role === 'user' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : message.role === 'assistant' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
            </svg>
          ) : message.role === 'error' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold">
                {message.role === 'user' ? 'You' : 
                message.role === 'assistant' ? (
                  model ? model.name : 'AI'
                ) : 
                message.role === 'error' ? 'Error' : 'System'}
              </h3>
              {message.role === 'assistant' && model && (
                <span 
                  className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 inline-flex items-center"
                  title={`${model.provider} model - ${model.description || ''}`}
                >
                  {model.provider}
                  {model.icon && typeof model.icon === 'string' && (
                    <img src={model.icon} alt={model.provider} className="w-3 h-3 ml-1" />
                  )}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {typeof message.createdAt === 'string' 
                ? new Date(message.createdAt).toLocaleTimeString() 
                : message.createdAt.toLocaleTimeString()}
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animation-delay-200"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animation-delay-400"></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Generating response...</span>
              </div>
            ) : (
              <>
                {/* Display content based on type */}
                {(contentType === 'markdown' || contentType === 'text' || contentType === 'multipart') && message.content ? (
                  <div className="whitespace-pre-wrap break-words react-markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        p: ({node, children, ...props}) => {
                          return <p className="mb-2" {...props}>{children}</p>;
                        },
                        strong: ({node, children, ...props}) => {
                          return <strong className="font-bold inline" {...props}>{children}</strong>;
                        },
                        ol: ({node, children, ...props}) => {
                          return <ol className="list-decimal" {...props}>{children}</ol>;
                        },
                        ul: ({node, children, ...props}) => {
                          return <ul className="list-disc" {...props}>{children}</ul>;
                        },
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!inline && match) {
                            return (
                              <CodeBlock 
                                language={match[1]} 
                                code={String(children).replace(/\n$/, '')} 
                              />
                            );
                          }
                          return inline ? (
                            <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm" {...props}>
                              {children}
                            </code>
                          ) : (
                            <CodeBlock 
                              language="plaintext" 
                              code={String(children).replace(/\n$/, '')} 
                            />
                          );
                        },
                        li: ({node, children, ...props}) => {
                          return <li className="mb-1" {...props}>{children}</li>;
                        }
                      }}
                    >
                      {processMarkdownContent(message.content)}
                    </ReactMarkdown>
                  </div>
                ) : null}
                
                {/* Display attached images */}
                {message.images && message.images.length > 0 && (
                  <div className={`${message.content ? 'mt-3' : ''} space-y-2`}>
                    {message.images.map((image, index) => (
                      <ImageDisplay key={index} image={image} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {message.role === 'error' && (
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/settings#api-keys'}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Configure API Keys
              </button>
            </div>
          )}
          {message.usage && (
            <div className="mt-2 text-xs text-right text-gray-500 dark:text-gray-400">
              {formatTokenCount(message.usage.totalTokens)} tokens used
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;