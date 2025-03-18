'use client';

import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-64px)] overflow-hidden">
        {children}
      </div>
      <Footer />
    </>
  );
}