"use client";

// fileUploader.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient'; // Ensure you have Supabase initialized     
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { Document } from "@langchain/core/documents";

const FileUploader = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>(''); 
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  // Sanitize text to handle Unicode characters
  const sanitizeText = (text: string): string => {
    return text
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // Em and en dashes
      .replace(/[^\x20-\x7E\n\r\t]/g, ''); // Remove other non-ASCII characters
  };

  // Improved text chunking function with smaller chunks
  const chunkText = (text: string, chunkSize: number = 200): string[] => {
    const sanitizedText = sanitizeText(text);
    console.log(sanitizedText);
    const chunks: string[] = [];
    const sentences = sanitizedText.split(/[.!?]+/);
    let currentChunk = '';
    let estimatedTokens = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // Rough token estimation (1 token ≈ 4 characters)
      const estimatedSentenceTokens = Math.ceil(trimmedSentence.length / 4);

      if (estimatedTokens + estimatedSentenceTokens < 2000) {  // Keep well under the 8k limit
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence + '.';
        estimatedTokens += estimatedSentenceTokens;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = trimmedSentence + '.';
        estimatedTokens = estimatedSentenceTokens;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');

    try {
      let docs: Document[];
      
      if (file.type === 'application/pdf') {
        // Use WebPDFLoader for browser environment
        const blob = new Blob([file], { type: file.type });
        const loader = new WebPDFLoader(blob);
        docs = await loader.load();
      } else {
        // Handle text files
        const text = await file.text();
        docs = [new Document({ pageContent: text })];
      }

      // Use RecursiveCharacterTextSplitter
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await splitter.splitDocuments(docs);
      console.log(`Created ${splitDocs.length} chunks`);

      const batchSize = 100;
      for (let i = 0; i < splitDocs.length; i += batchSize) {
        const batchDocs = splitDocs.slice(i, i + batchSize);
        
        try {
          const embeddings = new OpenAIEmbeddings({
            apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          });

          const embeddedDocs = await embeddings.embedDocuments(
            batchDocs.map((doc: Document) => doc.pageContent)
          );

          for (let j = 0; j < batchDocs.length; j++) {
            const { error } = await supabase.from('documents').insert({
              content: batchDocs[j].pageContent,
              metadata: JSON.stringify({ 
                fileName: file.name,
                chunkIndex: i + j,
                totalChunks: splitDocs.length,
                ...batchDocs[j].metadata
              }),
              embedding: embeddedDocs[j],
            });

            if (error) throw error;
          }
        } catch (batchError: any) {
          console.error('Batch processing error:', batchError);
          throw new Error(batchError.message || 'Unknown batch error');
        }
        
        setMessage(`Processing... ${Math.min((i + batchSize), splitDocs.length)}/${splitDocs.length} chunks`);
      }

      setMessage(`File uploaded and processed successfully! Created ${splitDocs.length} chunks.`);
      setIsProcessingComplete(true);
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Upload Document
        </h2>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center w-full">
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg 
                  className="w-8 h-8 mb-3 text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF or TXT files</p>
              </div>
              <input 
                id="file-upload"
                type="file" 
                className="hidden" 
                accept=".pdf,.txt" 
                onChange={(e) => e.target.files && setFile(e.target.files[0])} 
              />
            </label>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          <button
            onClick={handleFileUpload}
            disabled={!file || loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
              ${!file || loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              'Upload File'
            )}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {isProcessingComplete && (
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
          >
            Go to Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
