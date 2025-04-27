'use client';

import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PlagiarismDetectionFormProps {
  text: string;
  setText: (text: string) => void;
  title: string;
  setTitle: (title: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
}

const PlagiarismDetectionForm: React.FC<PlagiarismDetectionFormProps> = ({
  text,
  setText,
  title,
  setTitle,
  onSubmit,
  isLoading,
  error
}) => {
  const [wordCount, setWordCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    setWordCount(words.length);
    
    if (validationError) {
      setValidationError(null);
    }
  }, [text, validationError]);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSelectedFile(file);
    setValidationError(null);

    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPDF(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.type === 'application/msword'
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        throw new Error('Please upload a PDF or Word document (.pdf, .doc, or .docx)');
      }

      if (extractedText && extractedText.trim()) {
        setText(extractedText.trim());
        setValidationError(null);
      } else {
        throw new Error('Could not extract text from the document. Please try again.');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      setValidationError(error instanceof Error ? error.message : 'Error processing the document. Please try again.');
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setValidationError('Please enter some text to analyze.');
      return;
    }

    if (wordCount < 10) {
      setValidationError('Please enter at least 10 words for accurate analysis.');
      return;
    }
    
    onSubmit(e);
  };
  
  const handleSampleText = () => {
    setTitle("The Impact of Artificial Intelligence on Society");
    const sampleText = `Artificial intelligence (AI) is transforming the way we work, learn, and communicate. From voice assistants and recommendation systems to autonomous vehicles and medical diagnostics, AI technologies are becoming increasingly integrated into our daily lives. These systems analyze vast amounts of data to identify patterns, make predictions, and automate tasks that once required human intelligence.

While AI offers tremendous benefits in efficiency and innovation, it also raises important questions about privacy, bias, accountability, and the future of work. As these technologies continue to evolve, society faces the challenge of harnessing their potential while addressing ethical concerns and ensuring that AI development benefits humanity as a whole.

The development of responsible AI requires collaboration among technologists, policymakers, ethicists, and the broader public to establish guidelines, standards, and regulations that align with human values and societal goals.`;
    setText(sampleText);
  };

  const textTooShort = wordCount < 10;
  const textIdealLength = wordCount >= 50 && wordCount <= 1000;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title (Optional)
          </label>
        </div>
        <input
          type="text"
          id="title"
          name="title"
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          placeholder="Enter a title for the text (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Paste your text below or upload a document
          </label>
          <button
            type="button"
            onClick={handleSampleText}
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            Use sample text
          </button>
        </div>

        <div className="mb-4">
          <input
            type="file"
            id="file-upload"
            accept=".doc,.docx,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            disabled={isLoading || isProcessing}
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected file: {selectedFile.name}
              {isProcessing && ' (Processing...)'}
            </p>
          )}
        </div>

        <textarea
          id="content"
          name="content"
          rows={8}
          className="shadow-sm focus:ring-blue-500 text-black focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md resize-none"
          placeholder="Enter text to check for plagiarism..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading || isProcessing}
        />
        {(error || validationError) && (
          <p className="mt-2 text-sm text-red-600">{error || validationError}</p>
        )}
        <div className="mt-2 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Word count: {wordCount}
            {textTooShort && (
              <span className="text-red-500 ml-2">
                (Minimum 10 words required)
              </span>
            )}
          </p>
          <button
            type="submit"
            disabled={isLoading || isProcessing || textTooShort}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isLoading || isProcessing || textTooShort
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PlagiarismDetectionForm; 