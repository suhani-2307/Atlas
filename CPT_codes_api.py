from flask import Flask, request, jsonify
from cortex.client import AsyncCortexClient
from groq import Groq
import asyncio
import os
import json

app = Flask(__name__)

# --- CONFIG ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # set in environment
groq_client = Groq(api_key=GROQ_API_KEY)

vector_client = AsyncCortexClient(host="localhost", port=50051)


# -----------------------------
# Vector DB Lookup
# -----------------------------
async def fetch_cpt_from_vector_db(cpt_code):
    collection = await vector_client.get_collection("cpt_codes")

    results = await collection.query(
        where={"cpt_code": cpt_code},
        limit=1
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
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    content = response.choices[0].message.content

    try:
        return json.loads(content)
    except:
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
        results = asyncio.run(fetch_cpt_from_vector_db(cpt_code))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not results or len(results["documents"]) == 0:
        return jsonify({"error": "CPT code not found"}), 404

    metadata = results["metadatas"][0]

    description = metadata.get("procedure_code_description", "")
    category = metadata.get("procedure_code_category", "")

    # Call Groq for dynamic estimate
    estimate = get_cost_estimate_from_groq(cpt_code, description, category)

    return jsonify({
        "cpt_code": cpt_code,
        "procedure_description": description,
        "category": category,
        "estimated_cost": estimate
    })


if __name__ == "__main__":
    app.run(debug=True)