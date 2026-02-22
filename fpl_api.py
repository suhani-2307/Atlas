from flask import Flask, jsonify, request

app = Flask(__name__)

# 2026 Federal Poverty Levels
FPL_BASE = 15960
FPL_PER_EXTRA = 5680

def get_fpl(household_size):
    if household_size < 1:
        raise ValueError("Household size must be at least 1")
    return FPL_BASE + FPL_PER_EXTRA * (household_size - 1)

def get_fpl_percentage(annual_income, household_size):
    return (annual_income / get_fpl(household_size)) * 100

def get_discount(fpl_pct):
    if fpl_pct <= 100:   return 100
    elif fpl_pct <= 200: return 75
    elif fpl_pct <= 300: return 50
    elif fpl_pct <= 400: return 25
    else:                return 0

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

    return jsonify({
        "estimated_deduction_amount": round(deduction_amount, 2)
    })

if __name__ == "__main__":
    app.run(debug=True)