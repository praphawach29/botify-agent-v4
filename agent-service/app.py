import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from tools.knowledge_tools import search_shop_knowledge

# We try to import google_antigravity; if not installed, it will raise ImportError.
try:
    from google_antigravity import LocalAgentConfig, Agent, ToolRunner
except ImportError:
    print("WARNING: google_antigravity not installed. Please pip install it.")

app = FastAPI(title="Botify V5 AI Brain")

# ─── Models ───────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class AskRequest(BaseModel):
    shop_id: str
    messages: List[Message]
    system_prompt: Optional[str] = "You are Botify V5 Consultative AI Sales Engineer. You help customers with product advice."

# ─── Helpers ──────────────────────────────────────────────────────────────
def check_system_status() -> str:
    """Checks the status of the AI Brain system. Use this when the user asks if the system is online."""
    return "The Botify V5 Python AI Brain is online and fully operational."

# ─── API Routes ───────────────────────────────────────────────────────────
@app.post("/ask")
async def ask_agent(req: AskRequest):
    try:
        # Initialize Tools
        tools = ToolRunner()
        tools.register(check_system_status)

        # ─── RAG Tool (Dynamic to inject shop_id) ───
        def wrapped_search_knowledge(query: str) -> str:
            """
            Search the shop's knowledge base, FAQs, and product specs for relevant information.
            Use this tool whenever the customer asks about store policies, how to use a product, or technical details.
            """
            return search_shop_knowledge(query, req.shop_id)
        
        tools.register(wrapped_search_knowledge)

        # Initialize Config
        config = LocalAgentConfig(
            model="gemini-1.5-flash",
            system_instruction=req.system_prompt
        )

        # Create Agent
        agent = Agent(config=config, tools=tools)

        # Pass the latest user message to the agent
        user_message = req.messages[-1].content if req.messages else ""
        if not user_message:
            raise ValueError("No messages provided")

        # Run Agent
        response = agent.run(user_message)
        
        return {"status": "success", "reply": response.text}

    except Exception as e:
        print(f"Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Knowledge Vectorization Endpoint ───────────────────────────────────────
import requests
import PyPDF2
import io
from tools.knowledge_tools import supabase, get_embedding

class EmbedRequest(BaseModel):
    knowledge_id: str
    shop_id: str

@app.post("/api/embed")
async def embed_knowledge(req: EmbedRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not connected.")
    
    try:
        # 1. Fetch record
        response = supabase.table("shop_knowledge").select("*").eq("id", req.knowledge_id).eq("shop_id", req.shop_id).execute()
        data = response.data
        if not data:
            raise HTTPException(status_code=404, detail="Knowledge record not found.")
        
        record = data[0]
        raw_content = record.get("raw_content") or ""
        k_type = record.get("type")
        
        # 2. Extract text if it's a PDF document
        if k_type == "document" and record.get("file_url"):
            file_url = record.get("file_url")
            try:
                # Download file
                file_resp = requests.get(file_url)
                file_resp.raise_for_status()
                
                # Check if PDF
                if file_url.lower().endswith(".pdf"):
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_resp.content))
                    extracted_text = ""
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text() + "\n"
                    raw_content = extracted_text.strip()
                elif file_url.lower().endswith(".csv") or file_url.lower().endswith(".txt"):
                    raw_content = file_resp.content.decode("utf-8")
                # Docx can be added later
                
            except Exception as e:
                print(f"File extraction error: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to extract document text: {str(e)}")
        
        if not raw_content:
            raise HTTPException(status_code=400, detail="No content available to vectorize.")
        
        # 3. Generate embedding
        embedding = get_embedding(raw_content)
        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding.")
            
        # 4. Update database
        update_data = {
            "embedding": embedding,
            "raw_content": raw_content  # Save extracted text back so we don't have to re-extract
        }
        supabase.table("shop_knowledge").update(update_data).eq("id", req.knowledge_id).execute()
        
        return {"status": "success", "message": "Knowledge vectorized successfully."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Embed Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Knowledge Search Endpoint ─────────────────────────────────────────────
from tools.knowledge_tools import search_shop_knowledge

class SearchRequest(BaseModel):
    query: str
    shop_id: str

@app.post("/api/search")
async def search_knowledge(req: SearchRequest):
    try:
        result = search_shop_knowledge(req.query, req.shop_id)
        return {"status": "success", "result": result}
    except Exception as e:
        print(f"Search Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
