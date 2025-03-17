export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: 'Submit your request',
      description: 'Enter your query in our intuitive chat interface. Our platform handles everything from simple questions to complex tasks.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Intelligent model selection',
      description: 'Our AI router analyzes your request and automatically selects the best model based on content, complexity, and your subscription tier.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'Get real-time responses',
      description: 'Experience AI responses streaming in real-time directly in your chat window, with support for code blocks, formatting, and more.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ]

  const modelLogos = [
    { name: 'OpenAI', icon: '/icons/openai.svg' },
    { name: 'Anthropic', icon: '/icons/anthropic.svg' },
    { name: 'Google', icon: '/icons/google.svg' },
    { name: 'Mistral', icon: '/icons/mistral.svg' },
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800" id="how-it-works">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Our intelligent platform handles AI model selection and workload distribution
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div 
              key={step.id}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 relative overflow-hidden transition-transform hover:scale-105 border border-gray-100 dark:border-gray-700"
            >
              {/* Step number */}
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xl">
                {step.id}
              </div>
              
              <div className="text-primary-600 dark:text-primary-400 mb-4 mt-2">
                {step.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {step.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Model logos section */}
        <div className="mt-20 text-center">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6">
            Connecting You with Leading AI Models
          </h3>
          
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {modelLogos.map((logo) => (
              <div 
                key={logo.name}
                className="flex flex-col items-center transition-transform hover:scale-110"
              >
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-full shadow-md flex items-center justify-center p-3 mb-2 border border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 text-gray-700 dark:text-gray-300">
                    <img 
                      src={logo.icon} 
                      alt={`${logo.name} logo`} 
                      className="w-full h-full"
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-10 max-w-2xl mx-auto text-gray-600 dark:text-gray-400 text-center">
            <p>
              Our platform selects the optimal AI model for your specific task, ensuring you always get the best results without the complexity of managing multiple API integrations.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}