from flask import Blueprint, request, jsonify
import math

financial_options_bp = Blueprint("financial_options", __name__)

@financial_options_bp.route("/rank-options", methods=["POST"])
def rank_options():

    data = request.json

    oop = data["estimated_oop"]
    income_percent_fpl = data["income_percent_fpl"]
    charity = data["hospital_charity_policy"]
    negotiation_rate = data["negotiation_success_rate"]
    payment_plan_months = data["hospital_payment_plan_months"]
    loan_apr = data["loan_apr"]
    loan_term = data["loan_term_months"]

    options = []

    # 1️⃣ Charity Care
    if income_percent_fpl <= charity["free_care_threshold"]:
        charity_cost = 0
    elif income_percent_fpl <= charity["discount_threshold"]:
        charity_cost = oop * (1 - charity["discount_percent"])
    else:
        charity_cost = None

    if charity_cost is not None:
        options.append({
            "option": "Charity Care",
            "total_cost": round(charity_cost, 2),
            "monthly_payment": 0,
            "score": charity_cost
        })

    # 2️⃣ Bill Negotiation
    negotiated_cost = oop * (1 - negotiation_rate)
    options.append({
        "option": "Bill Negotiation",
        "total_cost": round(negotiated_cost, 2),
        "monthly_payment": round(negotiated_cost / 12, 2),
        "score": negotiated_cost
    })

    # 3️⃣ Hospital Payment Plan
    options.append({
        "option": "Hospital Payment Plan",
        "total_cost": round(oop, 2),
        "monthly_payment": round(oop / payment_plan_months, 2),
        "score": oop
    })

    # 4️⃣ Medical Loan
    total_with_interest = oop * (1 + loan_apr)
    monthly_loan = total_with_interest / loan_term

    options.append({
        "option": "Medical Loan",
        "total_cost": round(total_with_interest, 2),
        "monthly_payment": round(monthly_loan, 2),
        "score": total_with_interest
    })

    # 🔥 Ranking Logic (Lowest total burden wins)
    ranked = sorted(options, key=lambda x: x["score"])

    # Remove internal score field
    for option in ranked:
        option.pop("score")

    return jsonify({
        "ranked_options": ranked[:4]
    })