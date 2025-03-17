'use client';

import RootLayout from './components/RootLayout'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'

export default function Home() {
  return (
    <RootLayout>
      <main>
        <Hero />
        <HowItWorks />
        <Pricing />
      </main>
    </RootLayout>
  )
}