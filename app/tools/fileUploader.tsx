"use client";

// fileUploader.tsx
import { useState } from 'react';
import { supabase } from './supabaseClient'; // Ensure you have Supabase initialized     
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { Document } from "@langchain/core/documents";

const FileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>(''); 

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
            batchDocs.map(doc => doc.pageContent)
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
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <input type="file" accept=".pdf,.txt" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
      <button onClick={handleFileUpload} disabled={!file || loading}>
        {loading ? 'Processing...' : 'Upload File'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUploader;
