from flask import Flask, request, jsonify
from cortex import AsyncCortexClient, Filter, Field
from sentence_transformers import SentenceTransformer
from groq import Groq
import asyncio
import os
import json

app = Flask(__name__)

# --- CONFIG ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Reuse a single event loop to avoid gRPC too_many_pings
_loop = asyncio.new_event_loop()


# -----------------------------
# Vector DB Lookup
# -----------------------------
async def fetch_cpt_from_vector_db(cpt_code: str):
    async with AsyncCortexClient("localhost:50051") as client:
        # Use the CPT code as the query text; filter ensures exact code match
        query_vector = embed_model.encode(cpt_code).tolist()
        cpt_filter = Filter().must(Field("cpt_code").eq(cpt_code))
        results = await client.search(
            "cpt_codes",
            query_vector,
            top_k=1,
            filter=cpt_filter,
            with_payload=True,
        )
    return results


# -----------------------------
# Groq Cost Estimation
# -----------------------------
def get_cost_estimate_from_groq(cpt_code, description, category):

    prompt = f"""
You are a US healthcare billing estimator.

Given:
CPT Code: {cpt_code}
Procedure Description: {description}
Category: {category}

Provide a realistic estimated cost in USD for:
- in_network
- out_of_network

Return ONLY valid JSON like:
{{
  "in_network": number,
  "out_of_network": number,
  "reasoning": "short explanation"
}}
"""

    response = groq_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    content = response.choices[0].message.content or ""

    try:
        return json.loads(content)
    except Exception:
        return {"error": "Failed to parse Groq response", "raw": content}


# -----------------------------
# Flask Endpoint
# -----------------------------
@app.route("/estimate-cost", methods=["POST"])
def estimate_cost_api():

    data = request.get_json()

    if not data or "cpt_code" not in data:
        return jsonify({"error": "Please provide a CPT code"}), 400

    cpt_code = str(data["cpt_code"]).strip()

    try:
        results = _loop.run_until_complete(fetch_cpt_from_vector_db(cpt_code))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not results:
        return jsonify({"error": "CPT code not found"}), 404

    r = results[0]
    payload = r.payload or {}
    description = payload.get("procedure_code_description", "")
    category = payload.get("procedure_code_category", "")

    estimate = get_cost_estimate_from_groq(cpt_code, description, category)

    return jsonify(
        {
            "cpt_code": cpt_code,
            "procedure_description": description,
            "category": category,
            "estimated_cost": estimate,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
