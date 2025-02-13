"use client";  // Add this at the very top of the file

// chat.tsx
import { useState } from 'react';
import { supabase } from '../tools/supabaseClient';
import { OpenAIEmbeddings } from '@langchain/openai';

const Chat = () => {
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
    <div className="chat">
      <input
        type="text"
        placeholder="Ask a question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleQuerySubmit} disabled={loading}>
        {loading ? 'Searching...' : 'Ask'}
      </button>
      {response && <pre style={{ whiteSpace: 'pre-wrap' }}>{response}</pre>}
    </div>
  );
};

export default Chat;
