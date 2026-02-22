"""
Simple Flask API Template
A basic Flask API with common patterns for building RESTful APIs.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
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
)

load_dotenv(".env.example")  # Load environment variables from .env file


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
CORS(app)

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
                    "fpl_discount": {
                        "calculate": "POST /fpl-discount",
                    },
                },
            }
        ),
        200,
    )


# 2026 Federal Poverty Levels (from healthcare.gov)
FPL_BASE = 15960
FPL_PER_EXTRA = 5680


def get_fpl(household_size):
    if household_size < 1:
        raise ValueError("Household size must be at least 1")
    return FPL_BASE + FPL_PER_EXTRA * (household_size - 1)


def get_fpl_percentage(annual_income, household_size):
    return (annual_income / get_fpl(household_size)) * 100


def get_discount(fpl_pct):
    if fpl_pct <= 100:
        return 100
    elif fpl_pct <= 200:
        return 75
    elif fpl_pct <= 300:
        return 50
    elif fpl_pct <= 400:
        return 25
    else:
        return 0


@app.route("/fpl-discount", methods=["POST"])
def fpl_discount():
    data = request.get_json()

    try:
        income = float(data.get("income"))
        household_size = int(data.get("household_size"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid income or household_size"}), 400

    if household_size < 1:
        return jsonify({"error": "household_size must be at least 1"}), 400
    if income < 0:
        return jsonify({"error": "income cannot be negative"}), 400

    fpl = get_fpl(household_size)
    fpl_pct = get_fpl_percentage(income, household_size)
    discount_percent = get_discount(fpl_pct)

    # Estimated deduction amount
    deduction_amount = (discount_percent / 100) * income

    return jsonify(
        {
            "household_size": household_size,
            "annual_income": income,
            "fpl_threshold": fpl,
            "fpl_percentage": round(fpl_pct, 1),
            "hospital_discount_percent": discount_percent,
            "estimated_deduction_amount": round(deduction_amount, 2),
        }
    )


@app.route("/api/insurance/extract", methods=["POST"])
def get_extracted_insurance():
    """Extract insurance info from base64 image or manual member_id/group_number"""
    payload = request.get_json(silent=True) or {}
    base64_value = payload.get("image_base64")
    member_id    = payload.get("member_id")
    group_number = payload.get("group_number")

    # ── Manual path: no image, just text fields ──────────────────────────────
    if not base64_value:
        if not member_id or not group_number:
            return jsonify({"error": "Provide either image_base64 or both member_id and group_number"}), 400
        return jsonify({
            "member_id":    member_id,
            "group_number": group_number,
            "insurer_name": "",
            "plan_name":    "",
        }), 200

    # ── Image path ────────────────────────────────────────────────────────────
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
