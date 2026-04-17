from __future__ import annotations

from typing import Any

import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoModel, AutoProcessor

MODEL_NAME = "google/siglip2-giant-opt-patch16-384"
EMBEDDING_DIMENSION = 1536

processor: Any | None = None
model: Any | None = None


def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"

    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"

    return "cpu"


device = get_device()


def get_embedding_model() -> tuple[Any, Any]:
    global processor, model

    if processor is None or model is None:
        print(f"Loading SigLIP2 ({MODEL_NAME}) on {device}...")
        processor = AutoProcessor.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME).to(device)
        model.eval()

    return processor, model


def move_inputs_to_device(inputs: Any) -> Any:
    if hasattr(inputs, "to"):
        return inputs.to(device)

    return {
        key: value.to(device) if hasattr(value, "to") else value
        for key, value in inputs.items()
    }


def extract_feature_tensor(features: Any) -> torch.Tensor:
    if isinstance(features, torch.Tensor):
        return features

    pooler_output = getattr(features, "pooler_output", None)
    if isinstance(pooler_output, torch.Tensor):
        return pooler_output

    last_hidden_state = getattr(features, "last_hidden_state", None)
    if isinstance(last_hidden_state, torch.Tensor):
        return last_hidden_state.mean(dim=1)

    raise TypeError(f"Unsupported embedding output type: {type(features).__name__}")


def normalize_feature_vector(features: Any) -> list[float]:
    feature_tensor = extract_feature_tensor(features)
    normalized = F.normalize(feature_tensor.detach().float(), p=2, dim=-1)
    return normalized[0].cpu().tolist()


def zero_embedding() -> list[float]:
    return [0.0] * EMBEDDING_DIMENSION


def generate_image_embedding(image_path: str) -> list[float]:
    """
    Encodes an uploaded image into SigLIP2's shared image-text vector space.
    """
    try:
        processor_instance, model_instance = get_embedding_model()
        with Image.open(image_path) as raw_image:
            image = raw_image.convert("RGB")

        inputs = processor_instance(images=[image], return_tensors="pt")
        inputs = move_inputs_to_device(inputs)

        with torch.no_grad():
            image_features = model_instance.get_image_features(**inputs)

        return normalize_feature_vector(image_features)
    except Exception as error:
        print(f"Image Embedding Error for {image_path}: {error}")
        return zero_embedding()


def generate_query_embedding(query: str) -> list[float]:
    """
    Encodes a search query into SigLIP2's shared image-text vector space.
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        return zero_embedding()

    try:
        processor_instance, model_instance = get_embedding_model()
        inputs = processor_instance(
            text=[cleaned_query],
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        inputs = move_inputs_to_device(inputs)

        with torch.no_grad():
            text_features = model_instance.get_text_features(**inputs)

        return normalize_feature_vector(text_features)
    except Exception as error:
        print(f"Query Embedding Error: {error}")
        return zero_embedding()
