from groq import Groq
from flask import Flask, jsonify, request
import base64
import json
import os
from typing import Optional
from pydantic import BaseModel, Field


class InsuranceId(BaseModel):
    member_name: str = Field(..., description="Primary member name")
    member_id: str = Field(..., description="Member ID")
    group_number: str = Field(..., description="Group number")
    dependent_name: Optional[str] = Field(None, description="Dependent name")
    plan_name: Optional[str] = Field(None, description="Plan name")
    insurer_name: str = Field(..., description="Insurer name")
    effective_date: Optional[str] = Field(None, description="Effective date")
    expiration_date: Optional[str] = Field(None, description="Expiration date")
    copay: Optional[str] = Field(None, description="Copay details")
    deductible: str = Field(..., description="Deductible IND/FAM")
    oopm: str = Field(..., description="Out-of-pocket maximum IND/FAM")
    rx_bin: Optional[str] = Field(None, description="Rx BIN")
    rx_pcn: Optional[str] = Field(None, description="Rx PCN")
    rx_group: Optional[str] = Field(None, description="Rx group")
    rx_id: Optional[str] = Field(None, description="Rx ID")
    notes: Optional[str] = Field(None, description="Additional notes")


MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
PROMPT_TEXT = (
    "Extract every possible insurance ID detail from this image. "
    "If a field exists on the card, return it with its exact value. "
    "If a field is not present or not readable, return 'NONE'. "
    "Do not add extra fields beyond the schema."
)

app = Flask(__name__)


def get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("Missing GROQ_API_KEY environment variable")
    return Groq(api_key=api_key)


def normalize_base64(value: str) -> str:
    if value.startswith("data:"):
        return value.split(",", 1)[1]
    return value


def image_file_to_base64(file_storage) -> str:
    return base64.b64encode(file_storage.read()).decode("utf-8")


@app.route("/extract", methods=["POST"])
def extract_insurance_info():
    base64_image = None

    if "image" in request.files:
        base64_image = image_file_to_base64(request.files["image"])
    elif request.is_json:
        payload = request.get_json(silent=True) or {}
        base64_value = payload.get("image_base64")
        if isinstance(base64_value, str) and base64_value.strip():
            base64_image = normalize_base64(base64_value.strip())

    if not base64_image:
        return jsonify({"error": "Provide an image file or image_base64"}), 400

    client = get_client()

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT_TEXT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "insurance_id",
                "schema": InsuranceId.model_json_schema(),
            },
        },
        model=MODEL_NAME,
    )

    content = chat_completion.choices[0].message.content
    try:
        return jsonify(json.loads(content))
    except json.JSONDecodeError:
        return jsonify({"raw": content})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
