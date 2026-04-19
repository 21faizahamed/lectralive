from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import os
import requests
app = FastAPI()

# Allow CORS so JS can POST
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

chroma_client = chromadb.Client()

class TranscriptPayload(BaseModel):
    text: str
    room_id: str

class QuestionPayload(BaseModel):
    question: str
    room_id: str
    target: str

@app.post("/api/transcript")
def add_transcript(payload: TranscriptPayload):
    if not payload.text.strip():
        return {"status": "empty"}
        
    # Segment chroma collections by room_id so classrooms don't overlap
    collection = chroma_client.get_or_create_collection(
        name=f"room_{payload.room_id}",
        embedding_function=embedding_function
    )
    
    # Very simple doc count just to auto-generate a unique ID
    current_docs = collection.get()
    next_id = f"chunk_{len(current_docs['ids'])}"
    
    collection.add(
        documents=[payload.text],
        ids=[next_id]
    )
    
    print(f"[RAG] Indexed new transcript chunk for {payload.room_id}: {payload.text[:50]}...")
    return {"status": "added", "id": next_id}

@app.post("/api/chat")
def ask_question(payload: QuestionPayload):
    if payload.target == "professor":
        return {"status": "flagged_to_professor", "answer": "Your question was sent to the professor."}
        
    try:
        collection = chroma_client.get_collection(
            name=f"room_{payload.room_id}",
            embedding_function=embedding_function
        )
    except Exception:
        # Get or create collection if it doesn't exist locally
        collection = chroma_client.get_or_create_collection(
            name=f"room_{payload.room_id}",
            embedding_function=embedding_function
        )
        
    # "Spontaneous" Fallback: If ChromaDB has 0 chunks (like after a restart or joining later), pull from Firestore
    if len(collection.get()["ids"]) == 0:
        print(f"[RAG] Local DB empty for {payload.room_id}. Fetching spontaneously from Firestore...")
        url = f"https://firestore.googleapis.com/v1/projects/lectralive/databases/(default)/documents/rooms/{payload.room_id}/captions?pageSize=1000"
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                docs = data.get("documents", [])
                
                texts_to_add = []
                ids_to_add = []
                
                for idx, doc_obj in enumerate(docs):
                    text_val = doc_obj.get("fields", {}).get("text", {}).get("stringValue", "").strip()
                    if text_val:
                        texts_to_add.append(text_val)
                        ids_to_add.append(f"fs_chunk_{idx}")
                
                if texts_to_add:
                    collection.add(
                        documents=texts_to_add,
                        ids=ids_to_add
                    )
                    print(f"[RAG] Successfully loaded {len(texts_to_add)} chunks from Firestore for {payload.room_id}")
        except Exception as e:
            print(f"[RAG] Error fetching from Firestore: {e}")

    if len(collection.get()["ids"]) == 0:
        return {"status": "success", "answer": "The professor hasn't spoken yet, so I don't have enough context!"}
        
    results = collection.query(
        query_texts=[payload.question],
        n_results=3
    )
    
    if not results["documents"] or len(results["documents"][0]) == 0:
        return {"status": "success", "answer": "I don't know based on the lecture."}
        
    context_docs = results["documents"][0]
    context = "\n\n".join(context_docs)

    prompt = f"""
You are an expert AI teaching assistant for this classroom. Your job is to answer student questions based on the lecture context.
Do NOT say "The professor said" or quote the lecture verbatim. Give a direct, synthesized answer as if you are explaining the concept directly to the student.
Answer ONLY using the Context Below. Do NOT hallucinate. 
If the answer is not in the context, say "I don't know based on today's lecture." Keep your answer incredibly concise, clear, and direct.

Context:
{context}

Question:
{payload.question}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    answer = response.choices[0].message.content
    return {"status": "success", "answer": answer}
