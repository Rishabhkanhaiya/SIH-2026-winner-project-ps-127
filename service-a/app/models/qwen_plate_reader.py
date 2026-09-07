import os
import re
import json
from typing import Dict, Any, Union
from PIL import Image
import numpy as np
try:
    from app.core.plate_grammar import PlateGrammar
except ImportError:
    from plate_grammar import PlateGrammar

class QwenPlateReader:
    """
    Production-ready Indian License Plate Reader powered by Qwen2.5-VL-3B.
    Capable of recognizing:
    - Standard English/HSRP plates (e.g., KA 03 MN 9993)
    - 2-line stacked plates
    - Regional Indic scripts (Hindi, Marathi, Kannada, Tamil, etc.)
    - Regional Indic numerals (०-९, ೦-೯ -> converted to standard 0-9)
    - Fancy / stylized calligraphy fonts
    """
    def __init__(self, model_id: str = "Qwen/Qwen2.5-VL-3B-Instruct", device: str = None):
        from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        self.torch_dtype = torch.bfloat16 if self.device == "cuda" else torch.float32

        print(f"Loading {model_id} on {self.device} ({self.torch_dtype})...")
        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            model_id,
            torch_dtype=self.torch_dtype,
            device_map="auto" if self.device == "cuda" else None
        )
        if self.device != "cuda":
            self.model.to(self.device)

        self.processor = AutoProcessor.from_pretrained(model_id)
        print("Qwen2.5-VL Plate Reader ready!")

    def _prepare_image(self, image_input: Union[str, Image.Image, np.ndarray]) -> Image.Image:
        from PIL import ImageEnhance, ImageFilter
        if isinstance(image_input, str):
            img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        elif isinstance(image_input, np.ndarray):
            # Check if BGR (OpenCV)
            if len(image_input.shape) == 3 and image_input.shape[2] == 3:
                img = Image.fromarray(image_input[:, :, ::-1])
            else:
                img = Image.fromarray(image_input)
            img = img.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        # Adaptive Super-Resolution Upscaling for Small License Plate Crops
        # Typical crops are tiny (e.g. 100x90 or 187x45) which starve the Vision Transformer of tokens.
        w, h = img.size
        min_target_h = 280
        min_target_w = 700
        if h < min_target_h or w < min_target_w:
            scale = max(min_target_h / float(h), min_target_w / float(w))
            new_w = int(round(w * scale))
            new_h = int(round(h * scale))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Dynamic Contrast & Edge Enhancement to make faint/shadowed/embossed characters pop
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.35)
        sharpener = ImageEnhance.Sharpness(img)
        img = sharpener.enhance(1.5)

        return img

    def read(self, image_input: Union[str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """
        Extracts vehicle license plate number from an image.
        
        :param image_input: Filepath, PIL Image, or numpy array (cv2).
        :return: Dict containing plate_number, success status, and details.
        """
        from qwen_vl_utils import process_vision_info

        pil_img = self._prepare_image(image_input)

        prompt = (
            "Analyze the vehicle license plate in this image and extract the registration number.\n"
            "Return a valid JSON object ONLY (with no markdown code fences and no conversational filler) matching this schema:\n"
            "{\n"
            '  "plate_number": "<extracted registration number or empty if unreadable>",\n'
            '  "confidence": <float between 0.0 and 1.0 representing your confidence in this reading>,\n'
            '  "image_quality": "<high | medium | low | blurry | dark | glare | angled>",\n'
            '  "readability": "<clear | partial | difficult | illegible>",\n'
            '  "slot_confidence": {\n'
            '    "state": <float 0.0 to 1.0>,\n'
            '    "rto": <float 0.0 to 1.0>,\n'
            '    "series": <float 0.0 to 1.0>,\n'
            '    "number": <float 0.0 to 1.0>\n'
            '  },\n'
            '  "visual_notes": "<brief description of plate visibility, blur, lighting, or angle>"\n'
            "}\n\n"
            "CRITICAL ALPR RULES:\n"
            "- Robust across all conditions:\n"
            "  * Extreme perspective / angled / slanted plates: read characters from left to right despite perspective tilt.\n"
            "  * Low resolution / pixelated / embossed plates: carefully inspect character strokes and contours.\n"
            "  * Yellow commercial plates or dark/shadowed plates: ignore background color differences.\n"
            "  * Separator dots/hyphens (e.g. 'MH.42.H.8088' or 'MH.09.BM.1500'): ignore the dots, extract characters cleanly as 'MH 42 H 8088' or 'MH 09 BM 1500'.\n"
            "- Standard Indian MoRTH Structure:\n"
            "  * State code: 2 letters (e.g. MH, DL, HR, KA, TN, etc.)\n"
            "  * RTO code: 2 digits (e.g. 42, 09, 26, 01) or Delhi category (e.g. 1C, 13)\n"
            "  * Series: 1 or 2 letters (e.g. 'H', 'BM', 'BS', 'CA', 'AB')\n"
            "  * Number: 4 digits (e.g. 8088, 1500, 1396, 3456)\n"
            "- Character disambiguation:\n"
            "  * In digit slots: circles/ovals are digit '0' (never letter 'O' or 'D'); vertical bars are digit '1' (never letter 'I' or 'l').\n"
            "  * In letter slots: letters remain letters ('D' remains 'D', 'O' remains 'O').\n"
            "- Two-line (stacked) plates: combine top line and bottom line into one standard format.\n"
            "- Regional Indian numerals: convert Devanagari/regional numerals to standard 0-9 digits.\n"
            "- CRITICAL WARNING: NEVER hallucinate or output default examples like 'MH 01 AB 1234' or 'MH 12 AB 1234'. "
            "If the plate is truly illegible or not visible, set plate_number to '' and confidence to 0.0."
        )

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": pil_img,
                        "min_pixels": 256 * 28 * 28,
                        "max_pixels": 1280 * 28 * 28
                    },
                    {"type": "text", "text": prompt}
                ]
            }
        ]

        text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            padding=True,
            return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            generated_ids = self.model.generate(**inputs, max_new_tokens=128)
            generated_ids_trimmed = [
                out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            raw_output = self.processor.batch_decode(
                generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )[0].strip()

        # Parse JSON output from model with resilient fallback
        raw_plate = ""
        model_confidence = 0.85
        image_quality = "medium"
        readability = "clear"
        slot_confidence = {}
        visual_notes = ""

        try:
            # Strip potential ```json ... ``` markdown formatting
            clean_json = re.sub(r'^```(?:json)?\s*', '', raw_output, flags=re.IGNORECASE)
            clean_json = re.sub(r'\s*```$', '', clean_json).strip()
            data = json.loads(clean_json)
            raw_plate = data.get("plate_number", "")
            model_confidence = float(data.get("confidence", 0.85))
            image_quality = data.get("image_quality", "medium")
            readability = data.get("readability", "clear")
            slot_confidence = data.get("slot_confidence", {})
            visual_notes = data.get("visual_notes", "")
        except Exception:
            # Fallback: Extract from plain text if JSON decode failed
            json_match = re.search(r'\{.*\}', raw_output, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group(0))
                    raw_plate = data.get("plate_number", "")
                    model_confidence = float(data.get("confidence", 0.85))
                    image_quality = data.get("image_quality", "medium")
                    readability = data.get("readability", "clear")
                    slot_confidence = data.get("slot_confidence", {})
                    visual_notes = data.get("visual_notes", "")
                except Exception:
                    raw_plate = re.sub(r'[\r\n"`*]', '', raw_output).strip()
            else:
                raw_plate = re.sub(r'[\r\n"`*]', '', raw_output).strip()

        # Validate and normalize against Indian Government Number Plate Grammar
        grammar_result = PlateGrammar.validate_and_parse(
            raw_plate,
            auto_repair=True,
            model_confidence=model_confidence,
            image_quality=image_quality
        )

        is_wrong_read = grammar_result.get("is_wrong_read", False)
        is_valid = grammar_result.get("is_valid", False)
        final_plate_number = "Wrong read" if is_wrong_read else (grammar_result["normalized_plate"] if is_valid else raw_plate)

        return {
            "success": is_valid and not is_wrong_read,
            "plate_number": final_plate_number,
            "is_wrong_read": is_wrong_read,
            "status": "WRONG_READ" if is_wrong_read else ("SUCCESS" if is_valid else "INVALID_GRAMMAR"),
            "confidence": grammar_result["confidence"],
            "confidence_percent": grammar_result["confidence_percent"],
            "model_confidence": model_confidence,
            "image_quality": image_quality,
            "readability": readability,
            "slot_confidence": slot_confidence,
            "visual_notes": visual_notes,
            "raw_output": raw_output,
            "model": "Qwen2.5-VL-3B",
            "grammar": grammar_result
        }
