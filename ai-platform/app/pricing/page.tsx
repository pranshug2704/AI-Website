'use client';

import RootLayout from '../components/RootLayout';
import PricingComponent from '../components/Pricing';


export default function PricingPage() {
  return (
    <RootLayout>
      <main className="min-h-screen">
        <div className="pt-16 pb-6 bg-gray-50 dark:bg-gray-900">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Choose the plan that fits your needs and scale as you grow
              </p>
            </div>
          </div>
        </div>
        
        <PricingComponent />
        
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-3xl mx-auto divide-y divide-gray-200 dark:divide-gray-700">
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Can I change my plan later?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing cycle.
                </p>
              </div>
              
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  What happens if I exceed my monthly requests?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  If you exceed your monthly request limit, you can continue using the platform at a pay-as-you-go rate. You'll be charged for additional requests at the end of your billing cycle.
                </p>
              </div>
              
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  How does the AI model selection work?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Our platform intelligently routes your requests to the most appropriate AI model based on the nature of your query, complexity, and your subscription tier. Higher tiers have access to more advanced models.
                </p>
              </div>
              
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Do you offer a free trial?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Yes, our Free tier allows you to try out the platform with basic features. You can upgrade to a paid plan anytime to access more powerful models and higher request limits.
                </p>
              </div>
              
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For Enterprise plans, we also offer invoicing and other payment options.
                </p>
              </div>
              
              <div className="py-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Is there a long-term commitment?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  No, all plans are billed monthly and you can cancel anytime. There are no long-term contracts or cancellation fees.
                </p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Still have questions?
              </h3>
              <a 
                href="/contact" 
                className="btn btn-primary inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>
    </RootLayout>
  );
}