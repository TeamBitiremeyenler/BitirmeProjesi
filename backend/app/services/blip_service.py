from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch

# Load model globally so it's only loaded once into memory when the server starts
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading BLIP on {device}...")

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)

def generate_caption(image_path: str) -> str:
    """
    Takes an image path and returns an AI-generated descriptive caption.
    """
    try:
        raw_image = Image.open(image_path).convert('RGB')
        
        # Unconditional image captioning
        inputs = processor(raw_image, return_tensors="pt").to(device)
        out = model.generate(**inputs, max_new_tokens=50)
        
        caption = processor.decode(out[0], skip_special_tokens=True)
        return caption
    except Exception as e:
        print(f"BLIP Error parsing {image_path}: {e}")
        return ""
