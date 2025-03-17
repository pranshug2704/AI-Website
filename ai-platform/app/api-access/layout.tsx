import React from 'react';
import RootLayout from '../components/RootLayout';

export default function ApiAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootLayout>{children}</RootLayout>;
} 