from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import os

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
        # Collection might not exist if professor hasn't spoken yet
        return {"status": "success", "answer": "The professor hasn't spoken yet, so I don't have enough context!"}
        
    if len(collection.get()["ids"]) == 0:
        return {"status": "success", "answer": "I don't have any transcript data yet to answer this!"}
        
    results = collection.query(
        query_texts=[payload.question],
        n_results=3
    )
    
    if not results["documents"] or len(results["documents"][0]) == 0:
        return {"status": "success", "answer": "I don't know based on the lecture."}
        
    context_docs = results["documents"][0]
    context = "\n\n".join(context_docs)

    prompt = f"""
You are a helpful teaching assistant summarizing what the professor actually said.
Answer ONLY using the Context Below. Do NOT hallucinate. 
If the answer is not in the context, say "I don't know based on today's lecture." Keep your answer concise.

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
