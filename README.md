# AI Document Processing System

## Overview
This Next.js application provides an intelligent document processing system that can handle PDF and TXT files. It uses LangChain for document processing, OpenAI for embeddings, and Supabase for vector storage, enabling efficient document chunking and semantic search capabilities.

## Features
- 📄 Support for PDF and TXT file uploads
- 🔄 Automatic text chunking using LangChain's RecursiveCharacterTextSplitter
- 🧠 Document embeddings generation using OpenAI
- 💾 Vector storage in Supabase
- ⚡ Real-time processing status updates
- 🎯 Efficient batch processing for large documents

## Tech Stack
- **Frontend Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Document Processing**: LangChain
- **AI/ML**: OpenAI API
- **Database**: Supabase (PostgreSQL with pgvector)
- **Language**: TypeScript

## Prerequisites
- Node.js 18.x or higher
- PNPM package manager
- OpenAI API key
- Supabase account and project

## Environment Variables
Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

## Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up Supabase:
   - Create a new Supabase project
   - Enable pgvector extension
   - Create the necessary tables (see Database Setup section)

4. Start the development server:
```bash
pnpm dev
```

## Database Setup
Execute the following SQL in your Supabase SQL editor:

```sql
-- Enable the pgvector extension
create extension vector;

-- Create documents table
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- Create a search function
create function match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## Usage
1. Navigate to the application in your browser
2. Click the upload area or drag and drop a PDF/TXT file
3. Wait for the processing to complete
4. The document will be chunked, embedded, and stored in your database

## Project Structure
```
├── app/
│   ├── tools/
│   │   └── fileUploader.tsx
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── styles/
├── next.config.js
├── package.json
└── README.md
```

## Contributing
1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License
MIT License

## Acknowledgments
- [LangChain](https://js.langchain.com/docs) for document processing
- [OpenAI](https://openai.com) for embeddings
- [Supabase](https://supabase.com) for vector storage
- [Next.js](https://nextjs.org) for the framework
