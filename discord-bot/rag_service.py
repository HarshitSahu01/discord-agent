import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from supabase import Client
import tempfile
import asyncio

# We need to reuse the supabase client or create a new one. 
# Since this service might be called from main.py (upload) and chain.py (retrieval),
# let's accept the client as an argument or init it if needed.

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

async def process_and_store_document_background(file_content: bytes, filename: str, upload_id: int, supabase: Client):
    try:
        # 1. Save to temp file to use loaders
        suffix = ".pdf" if filename.endswith(".pdf") else ".txt"
        tmp_path = ""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            
            # 2. Load
            if filename.endswith(".pdf"):
                loader = PyPDFLoader(tmp_path)
                docs = await asyncio.to_thread(loader.load)
            else:
                loader = TextLoader(tmp_path)
                docs = await asyncio.to_thread(loader.load)

            # 3. Split
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                add_start_index=True
            )
            splits = text_splitter.split_documents(docs)

            # 4. Embed and Store
            if splits:
                texts = [d.page_content for d in splits]
                metadatas = [d.metadata for d in splits]
                
                # Add filename to metadata
                for m in metadatas:
                    m["source"] = filename

                # Embed
                vectors = await embeddings.aembed_documents(texts)

                # Insert into Supabase 'documents'
                records = []
                for text, meta, vec in zip(texts, metadatas, vectors):
                    records.append({
                        "content": text,
                        "metadata": meta,
                        "embedding": vec
                    })
                
                # Batch insert (supabase python client might need batching for large lists, but let's assume <100 chunks for now)
                supabase.table("documents").insert(records).execute()
            
            # Update status to completed
            supabase.table("uploads").update({"status": "completed"}).eq("id", upload_id).execute()

        except Exception as e:
            # Update status to failed
            print(f"RAG Processing Error: {e}")
            supabase.table("uploads").update({"status": "failed", "error_message": str(e)}).eq("id", upload_id).execute()
        
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as outer_e:
        print(f"Critical Worker Error: {outer_e}")

async def retrieve_relevant_chunks(query: str, supabase: Client, k: int = 5):
    # 1. Embed query
    query_vector = await embeddings.aembed_query(query)

    # 2. Call RPC function
    # Assuming 'match_documents' function exists in Supabase
    response = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_vector,
            "match_threshold": 0.5, # Adjust as needed
            "match_count": k
        }
    ).execute()

    return response.data
