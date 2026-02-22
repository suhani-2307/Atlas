/** Shared helpers used by /loading and /results pages. */

export const API_BASE = "http://localhost:5000";

// ── Money / percent parsing ──

export function parseMoney(raw: unknown): number {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw !== "string") return 0;
    const match = raw.match(/\$?([\d,]+(?:\.\d+)?)/);
    return match ? parseFloat(match[1].replace(/,/g, "")) : 0;
}

export function parsePercent(raw: unknown): number | null {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw > 1 ? raw / 100 : raw;
    }
    if (typeof raw !== "string") return null;
    const match = raw.match(/([\d.]+)\s*%?/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    return value > 1 || raw.includes("%") ? value / 100 : value;
}

// ── Insurance helpers ──

export function deriveInNetwork(
    insuranceData: Record<string, unknown> | null,
): boolean {
    if (!insuranceData) return true;
    const direct = insuranceData.in_network;
    if (typeof direct === "boolean") return direct;
    const status =
        typeof insuranceData.network_status === "string"
            ? insuranceData.network_status.toLowerCase()
            : "";
    if (status.includes("out")) return false;
    if (status.includes("in")) return true;
    return true;
}

export function computeInsuranceOop(
    totalInNetwork: number,
    insuranceData: Record<string, unknown> | null,
): number {
    if (!insuranceData || totalInNetwork <= 0) return 0;
    const deductible = parseMoney(insuranceData.deductible);
    const copay = parseMoney(insuranceData.copay);
    const coinsurance = parsePercent(
        insuranceData.coinsurance ??
            insuranceData.coinsurance_percent ??
            insuranceData.coinsurance_rate,
    );
    const oopm = parseMoney(
        insuranceData.oopm ??
            insuranceData.out_of_pocket_max ??
            insuranceData.out_of_pocket_maximum,
    );

    let oop = 0;
    if (deductible > 0) {
        const afterDeductible = Math.max(0, totalInNetwork - deductible);
        oop =
            Math.min(totalInNetwork, deductible) +
            (coinsurance ? afterDeductible * coinsurance : 0) +
            copay;
    } else if (coinsurance) {
        oop = totalInNetwork * coinsurance + copay;
    } else {
        oop = totalInNetwork + copay;
    }

    if (oopm > 0) oop = Math.min(oop, oopm);
    return oop;
}

// ── Session helpers ──

export function readSessionJSON<T>(key: string): T | null {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

export function getInsurancePayload(): Record<string, unknown> | null {
    const extractRaw = sessionStorage.getItem("aidaura_extract_result");
    const insuranceRaw = sessionStorage.getItem("aidaura_insurance_data");
    const raw = extractRaw || insuranceRaw;
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ── API fetch orchestration (used by /loading primarily, fallback in /results) ──

export interface CptResultItem {
    cpt_code: string;
    procedure_code_description: string;
    procedure_code_category: string;
    score: number;
    estimated_cost: {
        in_network: number;
        out_of_network: number;
        reasoning: string;
    };
}

export interface FplDataItem {
    household_size: number;
    annual_income: number;
    fpl_threshold: number;
    fpl_percentage: number;
    hospital_discount_percent: number;
    estimated_deduction_amount: number;
}

export interface RankedOptionItem {
    name: string;
    total_cost: number;
    monthly_payment: number;
    risk: number;
}

export interface FetchedResults {
    cptResults: CptResultItem[] | null;
    fplData: FplDataItem | null;
    rankedOptions: RankedOptionItem[] | null;
}

/**
 * Run all three backend calls (CPT pricing, FPL discount, rank options)
 * and persist results to sessionStorage.
 *
 * @param onStep Optional callback for progress updates: step 0/1 = parallel CPT+FPL, step 2 = ranking
 * @returns The fetched data bundle
 */
export async function fetchAllResults(
    onStep?: (step: number, status: "start" | "done" | "error") => void,
): Promise<FetchedResults> {
    const situation = sessionStorage.getItem("aidaura_situation") || "";
    const income = parseFloat(
        sessionStorage.getItem("aidaura_household_income") || "0",
    );
    const familySize = parseInt(
        sessionStorage.getItem("aidaura_family_size") || "1",
        10,
    );
    const insuranceData = getInsurancePayload();

    let cptResults: CptResultItem[] | null = null;
    let fplData: FplDataItem | null = null;

    // Steps 1 & 2 (parallel): CPT pricing + FPL discount
    onStep?.(0, "start");
    onStep?.(1, "start");

    try {
        const [cptRes, fplRes] = await Promise.all([
            fetch(`${API_BASE}/api/cpt/pricing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: situation,
                    score_threshold: 0.2,
                    top_k: 12,
                }),
            }),
            fetch(`${API_BASE}/fpl-discount`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ income, household_size: familySize }),
            }),
        ]);

        if (cptRes.ok) {
            const cptData = await cptRes.json();
            cptResults = cptData.results || [];
            sessionStorage.setItem(
                "aidaura_cpt_results",
                JSON.stringify(cptResults),
            );
            onStep?.(0, "done");
        } else {
            onStep?.(0, "error");
        }

        if (fplRes.ok) {
            fplData = await fplRes.json();
            sessionStorage.setItem("aidaura_fpl_data", JSON.stringify(fplData));
            onStep?.(1, "done");
        } else {
            onStep?.(1, "error");
        }
    } catch {
        onStep?.(0, "error");
        onStep?.(1, "error");
    }

    // Step 3 (sequential): rank options
    let rankedOptions: RankedOptionItem[] | null = null;
    onStep?.(2, "start");

    if (cptResults && fplData) {
        try {
            const totalInNetwork = cptResults.reduce(
                (sum, r) => sum + parseMoney(r.estimated_cost?.in_network),
                0,
            );
            const totalOutNetwork = cptResults.reduce(
                (sum, r) => sum + parseMoney(r.estimated_cost?.out_of_network),
                0,
            );
            const insuranceOop = computeInsuranceOop(
                totalInNetwork,
                insuranceData,
            );
            const totalOop =
                insuranceOop > 0
                    ? insuranceOop
                    : totalInNetwork > 0
                      ? totalInNetwork
                      : totalOutNetwork;
            const inNetwork = deriveInNetwork(insuranceData);

            const rankRes = await fetch(`${API_BASE}/rank-options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    estimated_oop: totalOop,
                    income_percent_fpl: fplData.fpl_percentage,
                    insurance_type:
                        (insuranceData as Record<string, unknown>)?.plan_type ||
                        "PPO",
                    in_network: inNetwork,
                    hospital_charity_policy: {
                        free_care_threshold: 100,
                        discount_threshold: 300,
                        discount_percent:
                            (fplData.hospital_discount_percent || 0) / 100,
                    },
                }),
            });

            if (rankRes.ok) {
                const rankData = await rankRes.json();
                rankedOptions = rankData.ranked_options || [];
                sessionStorage.setItem(
                    "aidaura_ranked_options",
                    JSON.stringify(rankedOptions),
                );
                onStep?.(2, "done");
            } else {
                onStep?.(2, "error");
            }
        } catch {
            onStep?.(2, "error");
        }
    } else {
        onStep?.(2, "error");
    }

    return { cptResults, fplData, rankedOptions };
}
