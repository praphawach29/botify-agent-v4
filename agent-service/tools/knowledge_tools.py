import os
from supabase import create_client, Client
from google import genai

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini client
GEMINI_KEY = os.environ.get("GEMINI_KEY", "")
ai_client = None
if GEMINI_KEY:
    ai_client = genai.Client(api_key=GEMINI_KEY)

def get_embedding(text: str) -> list[float]:
    """Generates a 768-dimensional embedding for the given text using Gemini."""
    if not ai_client:
        return []
    response = ai_client.models.embed_content(
        model='text-embedding-004',
        contents=text
    )
    return response.embeddings[0].values

def search_shop_knowledge(query: str, shop_id: str) -> str:
    """
    Search the shop's knowledge base, FAQs, and product specs for relevant information.
    Use this tool whenever the customer asks about store policies, how to use a product, or technical details.
    """
    if not supabase:
        return "Error: Database not connected."
    try:
        # Convert query to embedding
        embedding = get_embedding(query)
        if not embedding:
            return "Error: Failed to generate search embedding."
        
        # Call RPC
        response = supabase.rpc(
            'match_shop_knowledge',
            {
                'query_embedding': embedding,
                'match_threshold': 0.7,
                'match_count': 3,
                'p_shop_id': shop_id
            }
        ).execute()
        
        # Format results
        data = response.data
        if not data:
            return f"No knowledge found for query: '{query}'"
        
        results = []
        for item in data:
            results.append(f"Title: {item.get('title')}\nContent: {item.get('raw_content')}")
        
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"
