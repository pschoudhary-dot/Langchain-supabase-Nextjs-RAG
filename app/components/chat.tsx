"use client";  // Add this at the very top of the file

// chat.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../tools/supabaseClient';
import { OpenAIEmbeddings } from '@langchain/openai';

const Chat = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');

  const handleQuerySubmit = async () => {
    if (!query) return;
    setLoading(true);
    setResponse('');

    try {
      const embeddings = new OpenAIEmbeddings({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      });

      const queryEmbedding = await embeddings.embedQuery(query);

      const { data, error } = await supabase
        .rpc('match_documents', { 
          query_embedding: queryEmbedding, 
          match_count: 3 
        });

      if (error) throw error;

      if (data.length > 0) {
        // Remove duplicates and format response
        const uniqueResponses = [...new Set(data.map((doc: { content: string }) => doc.content))];
        setResponse(uniqueResponses.join('\n\n'));
      } else {
        setResponse('No matching documents found.');
      }
    } catch (error) {
      setResponse(`Error: ${(error as Error).message}`);
    } finally { 
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      {/* Upload button in top right */}
      <button
        onClick={() => router.push('/tools/fileuploader')}
        className="fixed top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center space-x-2 z-10"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Upload Files</span>
      </button>

      {/* Chat interface */}
      <div className="max-w-3xl mx-auto mt-16 space-y-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <input
            type="text"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-black"
          />
          <button 
            onClick={handleQuerySubmit} 
            disabled={loading}
            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
              ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Searching...' : 'Ask'}
          </button>
        </div>

        {response && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Response:</h3>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md text-sm text-black">
                {response}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
