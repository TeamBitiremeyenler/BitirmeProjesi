from sentence_transformers import SentenceTransformer
import torch

# Load model globally. 'clip-ViT-B-32' outputs exactly 512 dimensions, matching our DB schema.
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading SentenceTransformer (CLIP) on {device}...")

# We use the text-capable variant of CLIP to embed the English captions into 512-D space
model = SentenceTransformer('clip-ViT-B-32', device=device)

def generate_text_embedding(text: str) -> list[float]:
    """
    Takes a text string (like a BLIP caption) and returns a 512-dimensional vector.
    """
    if not text:
        # Return a zero vector of size 512 if no text is provided
        return [0.0] * 512
        
    try:
        # Generate embedding as a float array
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding Error: {e}")
        return [0.0] * 512
