"""
Simple Flask API Template
A basic Flask API with common patterns for building RESTful APIs.
"""

from flask import Flask, request, jsonify
from datetime import datetime
from functools import wraps
import os
import json
from dotenv import load_dotenv
from vision_ocr_api import (
    InsuranceId,
    MODEL_NAME,
    PROMPT_TEXT,
    get_client,
    normalize_base64,
    image_file_to_base64,
)

load_dotenv(".env.example")  # Load environment variables from .env file


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# In-memory storage for demo purposes
items = {}


# ==================== Error Handlers ====================


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({"error": "Internal server error"}), 500


# ==================== Decorators ====================


def require_json(f):
    """Decorator to require JSON content type"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        return f(*args, **kwargs)

    return decorated_function


# ==================== Health Check ====================


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return (
        jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}),
        200,
    )


# ==================== Root Endpoint ====================


@app.route("/", methods=["GET"])
def index():
    """API information endpoint"""
    return (
        jsonify(
            {
                "name": "Simple Flask API",
                "version": "1.0.0",
                "endpoints": {
                    "health": "/health",
                    "items": {
                        "list": "GET /api/items",
                        "get": "GET /api/items/<id>",
                        "create": "POST /api/items",
                        "update": "PUT /api/items/<id>",
                        "delete": "DELETE /api/items/<id>",
                    },
                    "hospital_payment_plans": {
                        "search": "POST /api/hospital/payment-plans",
                    },
                    "insurance": {
                        "extract": "POST /api/insurance/extract",
                    },
                },
            }
        ),
        200,
    )


@app.route("/api/insurance/extract", methods=["POST"])
def get_extracted_insurance():
    """Extract insurance info from base64 image string provided in JSON body"""
    payload = request.get_json(silent=True) or {}
    base64_value = payload.get("image_base64")

    if not base64_value:
        return jsonify({"error": "Missing image_base64 in request body"}), 400

    base64_image = normalize_base64(base64_value.strip())

    try:
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
        return jsonify(json.loads(content)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Entry Point ====================

if __name__ == "__main__":
    # Development server
    app.run(debug=True, host="0.0.0.0", port=5000)

    # For production, use:
    # app.run(debug=False, host='0.0.0.0', port=5000)
    # Or better, use a WSGI server like Gunicorn:
    # gunicorn -w 4 -b 0.0.0.0:5000 app:app
