'use client';

import { useState } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import { detectPlagiarism, PlagiarismResponse } from '@/lib/edenai';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// Dynamically import components with loading fallbacks
const PlagiarismDetectionForm = dynamic(
  () => import('./components/PlagiarismDetectionForm'),
  {
    loading: () => <div>Loading form...</div>,
    ssr: false // Disable server-side rendering for this component
  }
);

const PlagiarismDetectionResults = dynamic(
  () => import('./components/PlagiarismDetectionResults'),
  {
    loading: () => <div>Loading results...</div>,
    ssr: false // Disable server-side rendering for this component
  }
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error in plagiarism detection:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function PlagiarismDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [results, setResults] = useState<PlagiarismResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useDemo, setUseDemo] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }

    // Check if text is too short
    if (text.trim().split(/\s+/).length < 10) {
      setError('Please enter at least 10 words for accurate analysis.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Use mock data if the user has opted for demo mode or if the API was previously unavailable
      const data = await detectPlagiarism(text, title, useDemo || apiUnavailable);
      
      // Verify the data structure before using it
      if (!data || typeof data !== 'object' || !data.originalityai) {
        throw new Error('Invalid response format from the plagiarism detection service.');
      }
      
      // Make sure results is a valid object before setting state
      setResults(data);
    } catch (err: unknown) {
      console.error('Plagiarism Detection Error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Check for API credit exhaustion
      if (errorMessage && (
          errorMessage.includes('API credits exhausted') || 
          errorMessage.includes('No more credits')
      )) {
        setApiUnavailable(true);
        setError(
          'The API is currently unavailable due to usage limits. Would you like to try the demo mode instead?'
        );
      } 
      // Provide more user-friendly error messages for other errors
      else if (errorMessage && errorMessage.includes('length')) {
        setError('The text is too long. Please reduce the length and try again.');
      } else if (errorMessage && errorMessage.includes('rate limit')) {
        setError('Too many requests. Please try again in a few minutes.');
      } else {
        setError(errorMessage || 'An error occurred while analyzing the text. Please try again later.');
      }
      
      // If there's an error and we're not suggesting demo mode, enable it automatically
      if (!useDemo && !apiUnavailable) {
        console.log('Automatically falling back to demo mode due to error');
        setUseDemo(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to switch to demo mode
  const enableDemoMode = () => {
    setUseDemo(true);
    setError(null);
  };

  // Fallback UI for error boundary
  const errorFallback = (
    <div className="bg-red-50 p-4 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error displaying results</h3>
          <p className="mt-2 text-sm text-red-700">
            We encountered an issue processing the results. Please try again with a different text sample or try the demo mode.
          </p>
          <div className="mt-4">
            <button 
              onClick={enableDemoMode} 
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              <span className="block">Plagiarism Detection</span>
              <span className="block bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Check Content Originality</span>
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Paste any text to check for potential plagiarism. Our advanced system scans content against
              millions of web sources to identify matching segments.
            </p>
            
            {useDemo && (
              <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Demo Mode Active - Using simulated plagiarism detection results</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              {apiUnavailable && !useDemo ? (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700">
                        The API service has reached its usage limit. You can try the demo mode which uses simulated results.
                      </p>
                      <div className="mt-4">
                        <button 
                          onClick={enableDemoMode} 
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                          Try Demo Mode
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <PlagiarismDetectionForm 
                    text={text} 
                    setText={setText}
                    title={title}
                    setTitle={setTitle}
                    onSubmit={handleSubmit} 
                    isLoading={isLoading} 
                    error={error}
                  />
                  
                  {results && !isLoading && (
                    <div className="mt-6">
                      <ErrorBoundary fallback={errorFallback}>
                        <PlagiarismDetectionResults 
                          results={results} 
                          title={title}
                          isDemo={useDemo} 
                        />
                      </ErrorBoundary>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-16 bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How Our Plagiarism Detection Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Content Comparison</h3>
                <p className="text-gray-600">
                  Our technology scans your content against billions of web pages, academic papers, 
                  and publications to identify matching text segments.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-violet-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Source Identification</h3>
                <p className="text-gray-600">
                  For each matched segment, we provide detailed information about the source,
                  including the URL and the exact matching text.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Originality Analysis</h3>
                <p className="text-gray-600">
                  Get a comprehensive plagiarism score that indicates the percentage of 
                  original content, along with recommendations for improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 