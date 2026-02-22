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
from groq import Groq
from pydantic import BaseModel
from vision_ocr_api import (
    InsuranceId,
    MODEL_NAME,
    PROMPT_TEXT,
    get_client,
    normalize_base64,
)
from cpt_search import search_cpt_by_reason

load_dotenv()  # Load environment variables from .env file

_groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


class CostEstimate(BaseModel):
    in_network: float
    out_of_network: float
    reasoning: str


def get_cost_estimate_from_groq(cpt_code: str, description: str, category: str) -> dict:
    prompt = (
        f"You are a US healthcare billing estimator.\n\n"
        f"CPT Code: {cpt_code}\n"
        f"Procedure Description: {description}\n"
        f"Category: {category}\n\n"
        f"Provide realistic estimated costs in USD for in_network and out_of_network."
    )
    response = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "cost_estimate",
                "schema": CostEstimate.model_json_schema(),
            },
        },
        temperature=0.3,
    )
    content = response.choices[0].message.content or ""
    return CostEstimate.model_validate_json(content).model_dump()


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:3000"}},
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

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
                    "cpt": {
                        "search": "POST /api/cpt/search",
                        "pricing": "POST /api/cpt/pricing",
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


@app.route("/rank-options", methods=["POST", "OPTIONS"])
def rank_options():

    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json() or {}

    try:
        oop = float(data.get("estimated_oop", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "estimated_oop must be a number"}), 400
    if oop <= 0:
        return jsonify({"error": "estimated_oop must be greater than 0"}), 400

    try:
        income_percent_fpl = float(data.get("income_percent_fpl", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "income_percent_fpl must be a number"}), 400

    insurance_type = data.get("insurance_type", "PPO")  # PPO, HDHP, Medicaid, Uninsured
    in_network = bool(data.get("in_network", True))
    hospital_policy = data.get("hospital_charity_policy", {})
    if not hospital_policy:
        return jsonify({"error": "hospital_charity_policy is required"}), 400
    negotiation_rate = data.get("negotiation_success_rate", 0.2)
    payment_plan_months = data.get("hospital_payment_plan_months", 12)
    loan_apr = data.get("loan_apr", 0.15)
    loan_term = data.get("loan_term_months", 24)

    options = []

    free_care_threshold = hospital_policy.get("free_care_threshold", 100)
    discount_threshold = hospital_policy.get("discount_threshold", 300)
    discount_percent = hospital_policy.get("discount_percent", 0)

    # ----------------------------
    # 1 Charity Care (Income-based)
    # ----------------------------
    if income_percent_fpl <= free_care_threshold:
        options.append(
            {
                "name": "Full Charity Care",
                "total_cost": 0,
                "monthly_payment": 0,
                "risk": 0.1,
            }
        )

    elif income_percent_fpl <= discount_threshold:
        discounted = oop * (1 - discount_percent)
        options.append(
            {
                "name": "Partial Charity Care",
                "total_cost": discounted,
                "monthly_payment": discounted / payment_plan_months,
                "risk": 0.2,
            }
        )

    # ----------------------------
    # 2 Insurance Appeal (OON scenario)
    # ----------------------------
    if not in_network and insurance_type not in ["Medicaid"]:
        options.append(
            {
                "name": "Insurance Appeal for Out-of-Network Coverage",
                "total_cost": oop * 0.8,
                "monthly_payment": (oop * 0.8) / 12,
                "risk": 0.3,
            }
        )

    # ----------------------------
    # 3 Bill Negotiation
    # ----------------------------
    negotiated_cost = oop * (1 - negotiation_rate)
    options.append(
        {
            "name": "Direct Bill Negotiation",
            "total_cost": negotiated_cost,
            "monthly_payment": negotiated_cost / 12,
            "risk": 0.25,
        }
    )

    # ----------------------------
    # 4 Hospital Payment Plan
    # ----------------------------
    options.append(
        {
            "name": "Hospital Interest-Free Payment Plan",
            "total_cost": oop,
            "monthly_payment": oop / payment_plan_months,
            "risk": 0.05,
        }
    )

    # ----------------------------
    # 5 HSA/FSA (if HDHP)
    # ----------------------------
    if insurance_type == "HDHP" and data.get("hsa_balance", 0) > 0:
        options.append(
            {
                "name": "Use HSA Funds",
                "total_cost": oop,
                "monthly_payment": 0,
                "risk": 0.01,
            }
        )

    # ----------------------------
    # 6 Medical Loan (last resort)
    # ----------------------------
    total_with_interest = oop * (1 + loan_apr)
    options.append(
        {
            "name": "Medical Loan Financing",
            "total_cost": total_with_interest,
            "monthly_payment": total_with_interest / loan_term,
            "risk": 0.5,
        }
    )

    # ----------------------------
    # Scoring
    # ----------------------------
    max_cost = max(o["total_cost"] for o in options)
    if max_cost == 0:
        max_cost = 1

    for o in options:
        normalized_cost = o["total_cost"] / max_cost
        normalized_monthly = (o["monthly_payment"] / oop) if oop > 0 else 0

        o["score"] = 0.5 * normalized_cost + 0.3 * normalized_monthly + 0.2 * o["risk"]

    ranked = sorted(options, key=lambda x: x["score"])

    for r in ranked:
        r.pop("score")

    return jsonify({"ranked_options": ranked[:4]})


@app.route("/api/insurance/extract", methods=["POST"])
def get_extracted_insurance():
    """Extract insurance info from base64 image or manual member_id/group_number"""
    payload = request.get_json(silent=True) or {}
    base64_value = payload.get("image_base64")
    member_id = payload.get("member_id")
    group_number = payload.get("group_number")

    # ── Manual path: no image, just text fields ──────────────────────────────
    if not base64_value:
        if not member_id or not group_number:
            return (
                jsonify(
                    {
                        "error": "Provide either image_base64 or both member_id and group_number"
                    }
                ),
                400,
            )
        return (
            jsonify(
                {
                    "member_id": member_id,
                    "group_number": group_number,
                    "insurer_name": "",
                    "plan_name": "",
                }
            ),
            200,
        )

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


@app.route("/api/cpt/search", methods=["POST"])
def cpt_search():
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "Provide a non-empty 'reason' field"}), 400
    top_k = data.get("top_k", 10)
    score_threshold = data.get("score_threshold", 0.5)
    try:
        results = search_cpt_by_reason(
            reason, top_k=top_k, score_threshold=score_threshold
        )
        return jsonify({"reason": reason, "results": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cpt/pricing", methods=["POST"])
def cpt_pricing():
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "Provide a non-empty 'reason' field"}), 400
    top_k = data.get("top_k", 10)
    score_threshold = data.get("score_threshold", 0.5)
    try:
        cpt_results = search_cpt_by_reason(
            reason, top_k=top_k, score_threshold=score_threshold
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    results_with_pricing = []
    for item in cpt_results:
        estimate = get_cost_estimate_from_groq(
            item["cpt_code"],
            item["procedure_code_description"],
            item["procedure_code_category"],
        )
        results_with_pricing.append({**item, "estimated_cost": estimate})

    return jsonify({"reason": reason, "results": results_with_pricing}), 200


# ==================== Entry Point ====================

if __name__ == "__main__":
    # Development server
    app.run(debug=True, host="0.0.0.0", port=5000)

    # For production, use:
    # app.run(debug=False, host='0.0.0.0', port=5000)
    # Or better, use a WSGI server like Gunicorn:
    # gunicorn -w 4 -b 0.0.0.0:5000 app:app
