import { Metadata } from 'next';

// Default metadata for the site
export const defaultMetadata: Metadata = {
  metadataBase: new URL('https://ai-platform.example.com'),
  title: {
    default: 'AI Platform - Access Multiple AI Models in One Place',
    template: '%s | AI Platform'
  },
  description: 'Our platform intelligently distributes workloads across AI models based on your needs and subscription tier',
  keywords: ['AI', 'Artificial Intelligence', 'Machine Learning', 'AI Platform', 'AI API', 'Multiple AI Models'],
  authors: [{ name: 'AI Platform Team' }],
  creator: 'AI Platform Inc.',
  publisher: 'AI Platform Inc.',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ai-platform.example.com',
    siteName: 'AI Platform',
    title: 'AI Platform - Access Multiple AI Models in One Place',
    description: 'Our platform intelligently distributes workloads across AI models based on your needs and subscription tier',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'AI Platform - Access Multiple AI Models in One Place',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Platform - Access Multiple AI Models in One Place',
    description: 'Our platform intelligently distributes workloads across AI models based on your needs and subscription tier',
    creator: '@ai_platform',
    images: ['/og-image.png'],
  },
}