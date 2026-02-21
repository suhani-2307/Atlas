# Waypoint Charity Care Likelihood ML Model Blueprint

## 1. Problem Definition

**Business Question:**\
What is the probability that this patient will be approved for hospital
charity care?

**ML Formulation:**\
Binary classification problem.

y = 1 → Approved\
y = 0 → Denied / Unlikely

Model output:\
P(approval)

------------------------------------------------------------------------

## 2. Dataset Requirements

Since real charity care approval data is not publicly available, we
generate synthetic training data using:

-   Synthetic patient profiles (e.g., Synthea)
-   Hospital 501(r) Federal Poverty Level (FPL) thresholds
-   Policy generosity variables

### Dataset Schema

Each row represents one patient encounter.

  Feature                 Type          Source
  ----------------------- ------------- -------------------
  income                  numeric       synthetic patient
  family_size             numeric       synthetic patient
  age                     numeric       synthetic patient
  insurance_type          categorical   synthetic patient
  diagnosis_severity      numeric       derived from DRG
  hospital_id             categorical   hospital dataset
  hospital_fpl_free       numeric       501(r) policy
  hospital_fpl_discount   numeric       501(r) policy
  state                   categorical   hospital metadata
  urban_rural             binary        hospital metadata
  prior_utilization       numeric       synthetic history
  chronic_conditions      numeric       synthetic history

------------------------------------------------------------------------

## 3. Feature Engineering

### Step A: Compute Percent FPL

%FPL = (household income / FPL threshold for family size) × 100

------------------------------------------------------------------------

### Step B: Distance to Threshold (Critical Feature)

income_gap_free = %FPL - hospital_fpl_free\
income_gap_discount = %FPL - hospital_fpl_discount

------------------------------------------------------------------------

### Step C: Encode Categorical Variables

Use: - One-hot encoding, OR - Native categorical handling in XGBoost

------------------------------------------------------------------------

## 4. Synthetic Label Generation

Because real approval outcomes are unavailable, simulate realistic
approval behavior.

### Base Approval Probabilities

  Condition                 Base Probability
  ------------------------- ------------------
  %FPL ≤ free threshold     0.9
  free \< %FPL ≤ discount   0.65
  slightly above discount   0.35
  far above discount        0.05

### Add Real-World Variability

Adjust probability:

-   Uninsured → +0.10\
-   Medicaid → +0.05\
-   High severity DRG → +0.05\
-   Urban hospital → −0.05\
-   Income within 10% below threshold → −0.10

Final label generation:

Sample y from Bernoulli(p)

------------------------------------------------------------------------

## 5. Model Selection

### Recommended: XGBoost

Why: - Handles nonlinear threshold behavior - Strong performance on
tabular data - Fast and interpretable

Alternative: - Logistic Regression (simpler)

Avoid: - Neural networks - Model stacking - Over-engineering

------------------------------------------------------------------------

## 6. Training Pipeline

Split data: - 70% Train - 15% Validation - 15% Test

Optimize for: - AUC-ROC - Log loss

------------------------------------------------------------------------

## 7. Evaluation Metrics

### AUC-ROC

Measures discrimination ability.

### Precision-Recall

Useful for imbalanced approval rates.

### Calibration Curve

Ensures predicted probabilities match observed frequencies.

------------------------------------------------------------------------

## 8. Probability Calibration

Use: - Platt Scaling, OR - Isotonic Regression

Goal: If model predicts 0.80 → 80% of similar cases are approved.

------------------------------------------------------------------------

## 9. Explainability

Use SHAP values to determine:

-   Global feature importance
-   Individual prediction explanations

Example Output:

Primary Drivers: - Income gap from threshold - Insurance type - Hospital
generosity index

------------------------------------------------------------------------

## 10. Integration into Waypoint

Pipeline:

User Input\
↓\
%FPL calculation\
↓\
Feature vector creation\
↓\
ML model\
↓\
Approval probability\
↓\
Displayed in ranked financial pathways

Example Response:

High likelihood of approval (82%)\
Primary drivers: - Income below 200% FPL - Uninsured status - Generous
hospital policy

------------------------------------------------------------------------

## 11. Deployment Structure

Save model:

model.pkl

Expose prediction endpoint:

POST /predict_charity_likelihood

Input JSON:

{ "income": 42000, "family_size": 4, "hospital_id": 23,
"insurance_type": "Employer" }

Output JSON:

{ "approval_probability": 0.78, "confidence": "High" }

------------------------------------------------------------------------

## 12. Estimated Build Time

  Task                    Estimated Time
  ----------------------- ----------------
  Data cleaning           3 hrs
  Feature engineering     2 hrs
  Synthetic label logic   2 hrs
  Model training          2 hrs
  Calibration             1 hr
  SHAP explainability     1 hr
  Integration             2 hrs

Total: \~12--15 hours

------------------------------------------------------------------------

## Important Design Note

Because no public charity care approval dataset exists, clearly
document:

"This model was trained on synthetic labels informed by federal 501(r)
thresholds and stochastic approval behavior modeling."

Transparency strengthens credibility.
