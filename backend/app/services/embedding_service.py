from sentence_transformers import SentenceTransformer
import torch

# Phase 4 search should not pay the model load cost during API startup.
device = "cuda" if torch.cuda.is_available() else "cpu"
model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global model

    if model is None:
        print(f"Loading SentenceTransformer (CLIP) on {device}...")
        model = SentenceTransformer("clip-ViT-B-32", device=device)

    return model

def generate_text_embedding(text: str) -> list[float]:
    """
    Takes a text string (like a BLIP caption) and returns a 512-dimensional vector.
    """
    if not text:
        # Return a zero vector of size 512 if no text is provided
        return [0.0] * 512
        
    try:
        # Generate embedding as a float array
        embedding = get_embedding_model().encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding Error: {e}")
        return [0.0] * 512
