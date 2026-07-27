# Retrieval-Augmented Generation (RAG) Subsystem (`backend/app/rag`)

This directory implements vector database storage, document chunking, embedding generation, and tenant-isolated similarity search using PostgreSQL `pgvector`.

## Subsystem Structure

| File | Technical Description |
| :--- | :--- |
| **`store.py`** | Document ingestion, text splitting, embedding generation, vector persistence (`DocumentChunk`), and tenant/product-scoped cosine similarity search. |

## RAG Technical Flow

```
+---------------------------+
| Uploaded Business Doc     |
| (PDF, TXT, DOCX)          |
+---------------------------+
              |
              v
+---------------------------+
| Text Chunking             |
| (Recursive splitting with |
|  chunk_size & overlap)    |
+---------------------------+
              |
              v
+---------------------------+
| Embedding Generation      |
| (OpenRouter / MiniLM)     |
+---------------------------+
              |
              v
+---------------------------+
| Vector Store Insertion    |
| (pgvector `vector(1536)`) |
+---------------------------+
              |
              v
+---------------------------+
| Cosine Distance Query     |
| (Scoped by tenant/prod)   |
+---------------------------+
```

## Security & Multitenancy Guarantees

1. **Strict Multitenant Isolation**: Vector queries in `store.py` explicitly filter results by `organization_id` and `product_id`. Documents belonging to Organization A can never be retrieved by queries originating from Organization B.
2. **Embedding Dimension Flexibility**: Embedding dimensions are configured via `settings.EMBEDDINGS_DIM` (384 dimensions for local MiniLM embeddings, 1536 dimensions for OpenRouter `text-embedding-3-small`).
