from flask import Blueprint, request, jsonify

financial_options_bp = Blueprint("financial_options", __name__)

@financial_options_bp.route("/rank-options", methods=["POST"])
def rank_options():

    data = request.json

    oop = data["estimated_oop"]
    income_percent_fpl = data["income_percent_fpl"]
    insurance_type = data["insurance_type"]  # PPO, HDHP, Medicaid, Uninsured
    in_network = data["in_network"]
    hospital_policy = data["hospital_charity_policy"]
    negotiation_rate = data.get("negotiation_success_rate", 0.2)
    payment_plan_months = data.get("hospital_payment_plan_months", 12)
    loan_apr = data.get("loan_apr", 0.15)
    loan_term = data.get("loan_term_months", 24)

    options = []

    # ----------------------------
    # 1️⃣ Charity Care (Income-based)
    # ----------------------------
    if income_percent_fpl <= hospital_policy["free_care_threshold"]:
        options.append({
            "name": "Full Charity Care",
            "total_cost": 0,
            "monthly_payment": 0,
            "risk": 0.1
        })

    elif income_percent_fpl <= hospital_policy["discount_threshold"]:
        discounted = oop * (1 - hospital_policy["discount_percent"])
        options.append({
            "name": "Partial Charity Care",
            "total_cost": discounted,
            "monthly_payment": discounted / payment_plan_months,
            "risk": 0.2
        })

    # ----------------------------
    # 2️⃣ Insurance Appeal (OON scenario)
    # ----------------------------
    if not in_network and insurance_type not in ["Medicaid"]:
        options.append({
            "name": "Insurance Appeal for Out-of-Network Coverage",
            "total_cost": oop * 0.8,
            "monthly_payment": (oop * 0.8) / 12,
            "risk": 0.3
        })

    # ----------------------------
    # 3️⃣ Bill Negotiation
    # ----------------------------
    negotiated_cost = oop * (1 - negotiation_rate)
    options.append({
        "name": "Direct Bill Negotiation",
        "total_cost": negotiated_cost,
        "monthly_payment": negotiated_cost / 12,
        "risk": 0.25
    })

    # ----------------------------
    # 4️⃣ Hospital Payment Plan
    # ----------------------------
    options.append({
        "name": "Hospital Interest-Free Payment Plan",
        "total_cost": oop,
        "monthly_payment": oop / payment_plan_months,
        "risk": 0.05
    })

    # ----------------------------
    # 5️⃣ HSA/FSA (if HDHP)
    # ----------------------------
    if insurance_type == "HDHP" and data.get("hsa_balance", 0) > 0:
        hsa_used = min(oop, data["hsa_balance"])
        options.append({
            "name": "Use HSA Funds",
            "total_cost": oop,
            "monthly_payment": 0,
            "risk": 0.01
        })

    # ----------------------------
    # 6️⃣ Medical Loan (last resort)
    # ----------------------------
    total_with_interest = oop * (1 + loan_apr)
    options.append({
        "name": "Medical Loan Financing",
        "total_cost": total_with_interest,
        "monthly_payment": total_with_interest / loan_term,
        "risk": 0.5
    })

    # ----------------------------
    # 🎯 SCORING FUNCTION
    # ----------------------------
    max_cost = max(o["total_cost"] for o in options)

    for o in options:
        normalized_cost = o["total_cost"] / max_cost
        normalized_monthly = (o["monthly_payment"] / oop) if oop > 0 else 0

        o["score"] = (
            0.5 * normalized_cost +
            0.3 * normalized_monthly +
            0.2 * o["risk"]
        )

    ranked = sorted(options, key=lambda x: x["score"])

    for r in ranked:
        r.pop("score")

    return jsonify({
        "ranked_options": ranked[:4]
    })