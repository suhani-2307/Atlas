from groq import Groq
import base64
import os
from typing import Optional
from pydantic import BaseModel, Field


class InsuranceId(BaseModel):
    member_name: str = Field(..., description="Primary member name") #required
    member_id: str = Field(..., description="Member ID") #required
    group_number: str = Field(..., description="Group number")
    dependent_name: Optional[str] = Field(None, description="Dependent name")
    plan_name: Optional[str] = Field(None, description="Plan name")
    insurer_name: str = Field(..., description="Insurer name")   #required
    company_name: Optional[str] = Field(None, description="Company name")
    effective_date: Optional[str] = Field(None, description="Effective date")
    expiration_date: Optional[str] = Field(None, description="Expiration date")
    copay: Optional[str] = Field(None, description="Copay details")
    deductible: str = Field(..., description="Deductible IND/FAM") #required
    oopm: str = Field(..., description="Out-of-pocket maximum IND/FAM") #required
    rx_bin: Optional[str] = Field(None, description="Rx BIN")
    rx_pcn: Optional[str] = Field(None, description="Rx PCN")
    rx_group: Optional[str] = Field(None, description="Rx group")
    rx_id: Optional[str] = Field(None, description="Rx ID")
    notes: Optional[str] = Field(None, description="Additional notes")

# Function to encode the image
def encode_image(image_path):
  with open(image_path, "rb") as image_file:
    return base64.b64encode(image_file.read()).decode('utf-8')

# Path to your image
image_path = "gargi_id.jpeg"

# Getting the base64 string
base64_image = encode_image(image_path)

if not os.path.exists(image_path):
    raise FileNotFoundError(f"Image not found: {image_path}")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY environment variable")

client = Groq(api_key=GROQ_API_KEY)

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Extract every possible insurance ID detail from this image. "
                        "If a field exists on the card, return it with its exact value. "
                        "If a field is not present or not readable, return 'NONE'. "
                        "Do not add extra fields beyond the schema."
                    ),
                },
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
            "schema": InsuranceId.model_json_schema()
        }
    },
    model="meta-llama/llama-4-scout-17b-16e-instruct",
)

print(chat_completion.choices[0].message.content)