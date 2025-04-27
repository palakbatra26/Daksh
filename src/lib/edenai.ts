import axios from 'axios';

// AI Detection interfaces and functions
export interface AIDetectionResult {
  ai_score: number;
  items: {
    text: string;
    prediction: string;
    ai_score: number;
    ai_score_detail: number;
  }[];
  cost: number;
}

export interface AIDetectionResponse {
  winstonai: AIDetectionResult;
  [key: string]: AIDetectionResult;
}

// Plagiarism Detection interfaces
export interface PlagiarismCandidate {
  url: string;
  plagia_score: number;
  prediction: string;
  plagiarized_text: string;
}

export interface PlagiarismItem {
  text: string;
  candidates: PlagiarismCandidate[];
}

export interface PlagiarismResult {
  plagia_score: number;
  items: PlagiarismItem[];
  cost: number;
}

export interface PlagiarismResponse {
  originalityai: PlagiarismResult;
  [key: string]: PlagiarismResult;
}

// Mock data for when the API is unavailable or out of credits
export const getMockAIDetectionData = (text: string): AIDetectionResponse => {
  // Split text into sentences or paragraphs for mock segments
  const segments = text.split(/(?<=\.|\?|\!)\s+/).filter(segment => segment.trim().length > 0);
  
  // If no segments were found, create at least one
  const processedSegments = segments.length > 0 ? segments : [text || "Sample text for AI detection"];
  
  return {
    winstonai: {
      ai_score: 0.5, // Neutral score
      items: processedSegments.map(segment => ({
        text: segment,
        prediction: Math.random() > 0.5 ? 'ai-generated' : 'human',
        ai_score: Math.random(),
        ai_score_detail: Math.random()
      })),
      cost: 0
    }
  };
};

// Mock data for plagiarism detection
export const getMockPlagiarismData = (text: string): PlagiarismResponse => {
  const segments = text.split(/(?<=\.|\?|\!)\s+/).filter(segment => segment.trim().length > 0);
  const processedSegments = segments.length > 0 ? segments : [text || "Sample text for plagiarism detection"];
  
  const mockItems: PlagiarismItem[] = [];
  const numItems = Math.min(processedSegments.length, Math.max(3, Math.floor(Math.random() * 3) + 3));
  
  // Array of realistic academic and content websites with sample content
  const realisticSources = [
    {
      url: 'https://scholar.google.com/scholar?q=artificial+intelligence+ethics',
      content: 'The ethical implications of artificial intelligence have become increasingly important as AI systems become more sophisticated and integrated into society.',
      score: 0.85
    },
    {
      url: 'https://www.researchgate.net/publication/ai-ethics-2023',
      content: 'Recent developments in AI have raised significant concerns about bias, privacy, and accountability in automated decision-making systems.',
      score: 0.92
    },
    {
      url: 'https://www.sciencedirect.com/science/article/ai-society',
      content: 'The impact of artificial intelligence on modern society extends beyond technological advancement to fundamental changes in how we work and interact.',
      score: 0.78
    },
    {
      url: 'https://www.jstor.org/stable/ai-research',
      content: 'As AI systems become more prevalent, questions about their governance and regulation have come to the forefront of public discourse.',
      score: 0.88
    },
    {
      url: 'https://www.medium.com/ai-ethics',
      content: 'The development of ethical AI requires collaboration between technologists, policymakers, and ethicists to ensure responsible innovation.',
      score: 0.75
    }
  ];
  
  for (let i = 0; i < numItems; i++) {
    const itemText = processedSegments[i] || "Sample text for plagiarism detection";
    const numCandidates = Math.floor(Math.random() * 2) + 1;
    const candidates: PlagiarismCandidate[] = [];
    
    for (let j = 0; j < numCandidates; j++) {
      const randomSource = realisticSources[Math.floor(Math.random() * realisticSources.length)];
      candidates.push({
        url: randomSource.url,
        plagia_score: randomSource.score,
        prediction: randomSource.score > 0.7 ? 'plagiarized' : 'original',
        plagiarized_text: randomSource.content
      });
    }
    
    mockItems.push({
      text: itemText,
      candidates
    });
  }
  
  return {
    originalityai: {
      plagia_score: Math.floor(Math.random() * 40) + 5,
      items: mockItems,
      cost: 0
    }
  };
};

// API key (in a real application, this should be stored in environment variables)
const API_KEY = process.env.EDEN_AI_API_KEY || "";

// Utility function to validate API key
function validateApiKey(apiKey: string): boolean {
  const isValid = typeof apiKey === 'string' && apiKey.trim().length > 0;
  if (!isValid) {
    console.error("API Key validation failed. API Key:", apiKey ? "API key exists but may be invalid" : "API key is missing");
    console.error("Environment variable value:", process.env.EDEN_AI_API_KEY ? "Environment variable exists" : "Environment variable is missing");
  }
  return isValid;
}

export async function detectAIContent(text: string, useMockData: boolean = false): Promise<AIDetectionResponse> {
  // If mock data is requested, return it immediately
  if (useMockData) {
    console.log("Using mock AI detection data");
    return getMockAIDetectionData(text);
  }

  // Validate API key before making request
  if (!validateApiKey(API_KEY)) {
    console.error("Invalid API key detected. Current API key length:", API_KEY?.length || 0);
    throw new Error("Invalid API key. Please check your EDEN_AI_API_KEY environment variable.");
  }

  console.log("Making Eden AI API request with valid API key");
  
  const options = {
    method: "POST",
    url: "https://api.edenai.run/v2/text/ai_detection",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    data: {
      providers: "winstonai",
      text: text,
      fallback_providers: ""
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorData = error.response.data;
      console.error("Error response data:", errorData);
      
      // Handle payment required error (402)
      if (error.response.status === 402) {
        throw new Error("API credits exhausted. The demo is currently unavailable due to reaching API usage limits.");
      }
      
      // Handle different error structures
      if (errorData && typeof errorData === 'object') {
        if (errorData.message) {
          throw new Error(errorData.message);
        } else if (errorData.error) {
          throw new Error(errorData.error);
        } else if (errorData.detail) {
          throw new Error(errorData.detail);
        } else if (errorData["No more credits"]) {
          throw new Error("API credits exhausted. The demo is currently unavailable due to reaching API usage limits.");
        }
      }
      
      throw new Error(`API Error (${error.response.status}): ${JSON.stringify(errorData) || 'Unknown error'}`);
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Error: ${errorMessage}`);
    }
  }
}

export async function detectPlagiarism(text: string, title: string = "", useMockData: boolean = false): Promise<PlagiarismResponse> {
  // If mock data is requested, return it immediately
  if (useMockData) {
    console.log("Using mock plagiarism detection data");
    return getMockPlagiarismData(text);
  }

  // Validate API key before making request
  if (!validateApiKey(API_KEY)) {
    throw new Error("Invalid API key. Please check your EDEN_AI_API_KEY environment variable.");
  }

  const options = {
    method: "POST",
    url: "https://api.edenai.run/v2/text/plagia_detection",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    data: {
      providers: "originalityai",
      text: text,
      title: title
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorData = error.response.data;
      console.error("Error response data:", errorData);
      
      // Handle payment required error (402)
      if (error.response.status === 402) {
        throw new Error("API credits exhausted. The demo is currently unavailable due to reaching API usage limits.");
      }
      
      // Handle different error structures
      if (errorData && typeof errorData === 'object') {
        if (errorData.message) {
          throw new Error(errorData.message);
        } else if (errorData.error) {
          throw new Error(errorData.error);
        } else if (errorData.detail) {
          throw new Error(errorData.detail);
        } else if (errorData["No more credits"]) {
          throw new Error("API credits exhausted. The demo is currently unavailable due to reaching API usage limits.");
        }
      }
      
      throw new Error(`API Error (${error.response.status}): ${JSON.stringify(errorData) || 'Unknown error'}`);
    } else if (axios.isAxiosError(error) && error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Error: ${errorMessage}`);
    }
  }
} 