from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "Salesforce/blip-image-captioning-base"
processor: BlipProcessor | None = None
model: BlipForConditionalGeneration | None = None


def get_caption_model() -> tuple[BlipProcessor, BlipForConditionalGeneration]:
    global processor, model

    if processor is None or model is None:
        print(f"Loading BLIP ({MODEL_NAME}) on {device}...")
        processor = BlipProcessor.from_pretrained(MODEL_NAME)
        model = BlipForConditionalGeneration.from_pretrained(MODEL_NAME).to(device)

    return processor, model


def generate_caption(image_path: str, *, prompt: str | None = None) -> str:
    """
    Takes an image path and returns an AI-generated descriptive caption.
    """
    try:
        raw_image = Image.open(image_path).convert('RGB')
        processor_instance, model_instance = get_caption_model()

        if prompt:
            inputs = processor_instance(images=raw_image, text=prompt, return_tensors="pt").to(device)
        else:
            inputs = processor_instance(images=raw_image, return_tensors="pt").to(device)

        out = model_instance.generate(
            **inputs,
            do_sample=False,
            num_beams=4,
            max_new_tokens=50,
            min_new_tokens=6,
            no_repeat_ngram_size=2,
            repetition_penalty=1.15,
        )

        caption = processor_instance.decode(out[0], skip_special_tokens=True)
        return caption
    except Exception as e:
        print(f"BLIP Error parsing {image_path}: {e}")
        return ""
