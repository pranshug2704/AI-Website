import React from 'react'
import Link from 'next/link'

export default function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out the platform',
      features: [
        'Access to basic AI models',
        '100 requests per month',
        'Standard response time',
        'Basic API access',
        'Community support'
      ],
      cta: 'Get Started',
      ctaLink: '/signup',
      highlight: false
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For professionals and small teams',
      features: [
        'Access to advanced AI models',
        '1,000 requests per month',
        'Priority response time',
        'Full API access',
        'Email support',
        'Usage analytics'
      ],
      cta: 'Upgrade to Pro',
      ctaLink: '/signup?plan=pro',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For organizations with high-volume needs',
      features: [
        'Access to all AI models',
        'Unlimited requests',
        'Fastest response time',
        'Advanced API features',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee'
      ],
      cta: 'Contact Sales',
      ctaLink: '/contact',
      highlight: false
    }
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-900" id="pricing">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`rounded-xl overflow-hidden transition-all ${
                tier.highlight 
                  ? 'shadow-xl border-2 border-primary-500 dark:border-primary-400 scale-105 z-10' 
                  : 'shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg'
              }`}
            >
              <div 
                className={`p-8 ${
                  tier.highlight 
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 text-white' 
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {tier.name}
                </h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className={`text-4xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className={`text-lg ${tier.highlight ? 'text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className={`mb-6 ${tier.highlight ? 'text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                  {tier.description}
                </p>
              </div>
              
              <div className="p-8 bg-gray-50 dark:bg-gray-900 h-full flex flex-col">
                <ul className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link 
                  href={tier.ctaLink}
                  className={`w-full text-center py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                    tier.highlight 
                      ? 'bg-white text-primary-700 hover:bg-gray-100 hover:shadow-lg transform hover:-translate-y-1' 
                      : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 hover:shadow-lg transform hover:-translate-y-1'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}