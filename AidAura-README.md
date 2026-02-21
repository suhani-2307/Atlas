# AidAura

### Your Financial Guide Through a Medical Crisis

---

> **AidAura** is a real-time financial navigator that helps patients and families facing a medical emergency understand their true out-of-pocket costs, discover hidden financial assistance they qualify for, and choose the smartest financial pathway — before the bills arrive.

---

## Table of Contents

- [The Problem](#the-problem)
- [Who This Is For](#who-this-is-for)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
    - [Layer 1: Patient Inputs](#layer-1-patient-inputs)
    - [Layer 2: Processing Engine](#layer-2-processing-engine)
    - [Layer 3: Data Sources](#layer-3-data-sources)
    - [Layer 4: Patient Output](#layer-4-patient-output)
- [The Single Most Important Feature](#the-single-most-important-feature)
- [Data Challenges](#data-challenges)
- [Tech Stack](#tech-stack)
- [Datathon Challenge Design](#datathon-challenge-design)
    - [Datasets](#datasets)
    - [Challenge Tracks](#challenge-tracks)
    - [Judging Criteria](#judging-criteria)
- [Risks and Open Questions](#risks-and-open-questions)
- [License](#license)

---

## The Problem

When someone faces a sudden medical crisis, they are forced to make financial decisions that could mean the difference between manageable recovery and years of crushing debt — and they make those decisions completely blind.

- **Medical debt is the #1 cause of bankruptcy** in America.
- **Billions in charity care goes unclaimed** annually because patients don't know to apply.
- **Hospital pricing varies by 300%+** for identical procedures across facilities in the same city.
- **No existing tool connects** pricing, insurance, charity care, and financial options for the patient in crisis.

The data to solve this exists. It's scattered across hospital pricing files, insurance plan databases, charity care policies, Medicare fee schedules, and lending market data. Nobody has stitched it together for the person who actually needs it.

---

## Who This Is For

The primary user is a **patient or family member sitting in a hospital waiting room** during a medical emergency. They are scared, overwhelmed, and have no medical or financial background. They need the system to do the thinking for them. They don't have time to browse data or compare spreadsheets. They need actionable guidance immediately.

**Example scenario:** Maria's father just had a heart attack. He's in the ER at Memorial Hermann Hospital in Houston. The doctors say he needs a cardiac catheterization, possibly followed by stent placement. Maria is terrified, and on top of the fear, she has no idea what this will cost or what options her family has.

---

## How It Works

### Step 1 — Minimal Input

Maria provides the bare minimum: what happened (heart attack) and where she is (Memorial Hermann). GPS auto-detects the hospital. OCR on a photo of her father's insurance card extracts plan details. For anything she doesn't know, the system estimates using statistical defaults and flags these as approximate.

### Step 2 — Care Pathway & Cost Mapping

Based on the diagnosis and hospital, the system maps the likely care pathway and estimates costs. It warns about potential surprise charges (e.g., out-of-network anesthesiologist at an in-network hospital).

### Step 3 — Financial Pathways (Ranked Best to Worst)

1. **Charity Care** — Based on household income, her father may qualify for a 40–60% bill reduction. Application deadline: 30 days post-discharge. Required documents listed.
2. **Hospital Payment Plan** — 12-month interest-free plan. Estimated monthly payment: $400–$600.
3. **Bill Negotiation** — Median reduction of 23% at this hospital. Key leverage points identified.
4. **Medical Loan** — CareCredit at 15.9% APR vs. personal loan at 10.2% APR, with total cost comparison.

### Step 4 — Action Checklist

Specific questions to ask the billing department, documents to gather, deadlines she cannot miss, and hidden traps to avoid (like signing a payment agreement before checking charity care eligibility).

---

## System Architecture

Waypoint operates through four interconnected layers. Each layer feeds the next, transforming raw patient input into personalized, ranked financial pathways.

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Patient Inputs                                │
│  Diagnosis · Insurance · Hospital · Income · Deductible │
└──────────────────────────┬──────────────────────────────┘
                           │ validated inputs
                           ▼
┌─────────────────────────────────────────┐  ┌──────────────────────┐
│  LAYER 2: Processing Engine             │◄─┤  LAYER 3: Data       │
│                                         │  │  Sources             │
│  ┌─────────────┐   ┌─────────────────┐  │  │                      │
│  │ ICD-10/DRG  │──►│ Care Pathway    │  │  │  · Hospital MRFs     │
│  │ Code Mapper │   │ Predictor       │  │  │  · Medicare Fees     │
│  └─────────────┘   └───────┬─────────┘  │  │  · Insurance Plans   │
│                            │            │  │  · Charity Care DBs  │
│                            ▼            │  │  · Lending Rates     │
│  ┌─────────────────────────────────┐    │  │  · CFPB / MEPS       │
│  │ Cost Estimation Engine (ML)     │    │  └──────────────────────┘
│  │ Two-part model: XGBoost + GLM   │    │
│  └───────────────┬─────────────────┘    │
│                  │                      │
│                  ▼                      │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ Patient OOP  │─►│ Financial      │   │
│  │ Calculator   │  │ Pathway Ranker │   │
│  └──────────────┘  └───────┬────────┘   │
└────────────────────────────┼────────────┘
                             │ ranked pathways
                             ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Patient Output                                │
│                                                         │
│  Ranked Pathways · Cost Timeline · Action Checklist     │
│  Charity Care · Payment Plans · Negotiation · Loans     │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: Patient Inputs

Six data points, designed to be gathered in under two minutes during a crisis:

| Input                  | Collection Method          | Fallback if Unknown               |
| ---------------------- | -------------------------- | --------------------------------- |
| Diagnosis / ER Reason  | Patient's plain language   | Broad category estimate           |
| Insurance Plan Details | OCR scan of insurance card | Zip-code median plan profile      |
| Hospital / Location    | GPS auto-detection         | Manual entry                      |
| Household Income       | Self-reported range        | Zip-code median household income  |
| Deductible Status      | Self-reported or estimated | Time-of-year statistical estimate |
| Family Size & Age      | Self-reported              | Federal Poverty Level default     |

> **Design principle:** The system must be useful from the very first input. Each additional data point refines the output but is not required. Progressive disclosure, not upfront forms.

### Layer 2: Processing Engine

Five sequential modules:

**Module A — ICD-10 / DRG Code Mapper**
Translates plain-language descriptions into standardized billing codes using NLP entity extraction (Amazon Comprehend Medical or Spark NLP for Healthcare), then feeds into the CMS MS-DRG Grouper.

**Module B — Care Pathway Predictor**
Given the DRG and hospital, predicts the likely sequence of procedures, specialist consultations, and follow-up care using historical claims data patterns with probability-weighted branches.

**Module C — Cost Estimation Engine (ML)**
Two-part model (health econometrics standard):

- **Part 1 (Logistic):** Predicts whether any cost occurs per service category.
- **Part 2 (GLM + Gamma):** Predicts expected cost conditional on incurrence.
- **Combined:** `E(cost) = P(cost > 0) × E(cost | cost > 0)`
- **Ensemble:** Stacks XGBoost, GLM, and ANN via meta-learner.

Top predictive features: prior-year costs, diagnosis/HCC categories, age, chronic condition count, prior utilization, BMI, smoking status, insurance type, geography, prescription drug utilization.

**Module D — Patient OOP Calculator**
Deterministic (not ML). Applies insurance benefit structure: deductible remaining → coinsurance % → copay amounts → OOP maximum cap. Handles out-of-network balance billing exposure.

**Module E — Financial Pathway Ranker**
Hybrid rules engine + scoring model. Ranks all options:

1. Charity care screening (matches income vs. hospital 501(r) thresholds)
2. Disease-specific grants
3. Hospital payment plans (typically 0% interest, 12–24 months)
4. HSA/FSA funds
5. Bill negotiation (with benchmark reduction rates)
6. Medical loans (with rate comparisons and total cost over time)

### Layer 3: Data Sources

| Dataset                 | Source                     | Contents                                           | Access                   |
| ----------------------- | -------------------------- | -------------------------------------------------- | ------------------------ |
| Hospital MRF Prices     | ~6,000 hospital websites   | Gross charges, cash prices, payer-negotiated rates | Free; DoltHub aggregates |
| Medicare Fee Schedules  | data.cms.gov               | Payment rates by CPT, MS-DRG, APC                  | Free; open API           |
| Insurance Plan Benefits | data.healthcare.gov        | Copays, deductibles, coinsurance, OOP max          | Free CSV; ~37 states     |
| Charity Care Policies   | Hospital 501(r) filings    | Income thresholds, discount %, application windows | Partially public         |
| Lending Rate Data       | CFPB, Fed Reserve          | Medical loan APRs, CareCredit terms                | Free via CFPB API        |
| Claims & Expenditure    | MEPS (AHRQ), CMS DE-SynPUF | Person-level OOP costs, utilization                | Free; ~30K/year          |

### Layer 4: Patient Output

- **Ranked Financial Pathways** — Every option from best (charity care) to last resort (medical loans) with total cost, monthly burden, and tradeoffs.
- **Cost Timeline** — Estimated total OOP and monthly burden per pathway over 6–24 months.
- **Action Checklist** — Questions to ask, documents to gather, application deadlines, hidden traps.
- **Confidence Indicators** — Clear flagging of strong data vs. statistical estimates.

---

## The Single Most Important Feature

> **Automated charity care screening is the highest-impact feature Waypoint can offer.**
>
> Dollar For's data shows households under **204% of the Federal Poverty Level** qualify for free care and under **322% FPL** qualify for discounted care on average. Yet the vast majority of eligible patients never apply.

This is what separates Waypoint from every other healthcare cost tool. Existing solutions tell you what things cost. Waypoint tells you that **you might not have to pay at all**, and shows you exactly how to make that happen.

For the datathon, charity care screening creates the widest gap between a good solution and a great one. A team that only builds cost prediction produces a useful tool. A team that also builds automated charity care eligibility screening, cross-referenced against specific hospital 501(r) policies and the patient's income, produces something that could genuinely change lives.

---

## Data Challenges

### Hospital Price Transparency Quality

- Compliance rates disputed: CMS claims ~70%, independent audits report as low as 21%
- Inconsistent formats (JSON, CSV, malformed XML) across hospitals
- Non-standard payer naming (anonymous labels like "Payer 1")
- Missing negotiated rates (~48.6% of hospitals per some audits)
- Erroneous outlier prices and algorithm-based rates

### Critical Data Gaps

- Patient-specific deductible/accumulator status (requires real-time payer integration)
- Physician professional fees billed separately from facility fees
- Ancillary service costs (independent anesthesiology/radiology/pathology groups)
- Complication, readmission, and post-acute care costs
- Advanced EOB provision remains unimplemented despite 2022 statutory deadline

### HIPAA

Hospital MRF data, insurer Transparency in Coverage data, and Medicare fee schedules contain **no patient information** and are not PHI. A tool built on publicly posted pricing data does not trigger HIPAA requirements.

---

### vs. Industry

- **Turquoise Health** — Best price data platform ($55M raised), but serves industry, not patients.
- **Goodbill** — Post-care bill review. Operates after bills arrive, not during crisis.
- **Dollar For** — $131.7M+ in medical debt eliminated, but a nonprofit service, not self-service.
- **Castlight Health** — IPO'd at $2B, collapsed to $1.64/share. Cautionary tale: consumer engagement remains the unsolved problem.

---

## Tech Stack

### Data Ingestion & Normalization

- **Apache Spark** — Large-scale transforms for multi-GB hospital MRF files
- **dbt** — SQL-based normalization and data quality testing
- **Airflow** — Pipeline orchestration
- **DoltHub mrfutils** — Open-source streaming JSON parser for insurer MRFs
- **CMS HPT Validator** — Official compliance checker

### Storage

- **Delta Lake / Snowflake** — Normalized pricing, plan, and charity care data
- **Redis** — Caching for frequent price lookups
- **Neo4j** — Graph DB for diagnosis → procedure → provider relationships
- **Actian/ VectorAI DB** - 

### ML & Cost Estimation

- **XGBoost** — Primary cost prediction model
- **GLM (Gamma, log-link)** — Two-part cost distribution model
- **Ensemble Meta-learner** — Stacks XGBoost + GLM + ANN
- **Amazon Comprehend Medical / Spark NLP** — ICD-10 extraction from free text

### APIs & Integration

- **CMS Blue Button 2.0** — FHIR R4 access to Medicare claims (sandbox: 30K synthetic beneficiaries)
- **Turquoise Health API** — 1T+ harmonized rate records (commercial)
- **Serif Health API** — Rate search, market reimbursement (commercial)
- **FAIR Health API** — Benchmarks across 493 zones, 15K+ procedures (commercial)

---

## Datathon Challenge Design

### Datasets

1. **Synthea Synthetic Patients** — 10K–50K patients with diagnoses, insurance, costs, extended with realistic pricing variation (150–400% of Medicare)
2. **Hospital MRF Sample** — Raw files from 50–100 hospitals with intentional quality issues
3. **CMS Fee Schedules** — Complete Medicare payment rates (MPFS, IPPS, OPPS)
4. **ACA Marketplace Plan Data** — Insurance benefit structures by region
5. **Charity Care Policy Database** — 200+ hospital financial assistance policies
6. **CFPB Medical Debt Complaints** — Filtered complaint data



### Judging Criteria

| Criterion        | Weight | Measures                                                                    |
| ---------------- | ------ | --------------------------------------------------------------------------- |
| Impact           | 30%    | Would this genuinely help a person in crisis? Does it surface charity care? |
| Competitive Edge | 25%    | How creatively did the team connect disparate data? Surprising insights?    |
| Technical Rigor  | 20%    | Model accuracy, uncertainty calibration, edge case handling                 |
| Actionability    | 15%    | Is the output clear and usable by a non-technical person under stress?      |
| Equity Awareness | 10%    | Does the solution identify and address disparities?                         |

---

## Risks and Open Questions

1. **Consumer Engagement** — Castlight Health's failure proves building the tool is easier than getting people to use it. Crisis-moment design is the answer, but engagement remains the fundamental risk.
2. **Data Accuracy** — Hospital pricing data is inconsistent. Estimates must include confidence intervals and clear disclaimers.
3. **Liability** — Financial guidance during medical decisions creates potential liability. Waypoint must be positioned as informational, not advisory.
4. **Real-Time Insurance Data** — Patient-specific deductible status requires EDI 270/271 payer integration, a significant technical and partnership challenge.
5. **Charity Care DB Maintenance** — Hospital financial assistance policies change. Keeping the database current requires ongoing collection effort.
6. **Equity** — If Waypoint requires a smartphone, internet, and digital literacy, it may fail to reach the populations most in need.

---

## License

This project is currently unlicensed. Contact the maintainers for usage terms.

---

_Built with the conviction that no one should face financial ruin because they didn't know what questions to ask on the worst day of their life._
