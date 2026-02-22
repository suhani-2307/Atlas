from cortex import AsyncCortexClient, Filter, Field
from sentence_transformers import SentenceTransformer
from groq import Groq
from pydantic import BaseModel
from typing import List
import asyncio
import os
import json

COLLECTION_CPT = "cpt_codes"
COLLECTION_PROC = "procedure_index"
CORTEX_SERVER = "localhost:50051"
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Reuse a single event loop across all Flask requests to avoid creating a new
# gRPC channel on every call (which causes too_many_pings / ENHANCE_YOUR_CALM).
_loop = asyncio.new_event_loop()


class CategorySelection(BaseModel):
    selected_categories: List[str]


async def get_procedure_index_entries(client: AsyncCortexClient) -> List[dict]:
    """Retrieve all entries from the procedure_index collection."""
    records, _ = await client.scroll(COLLECTION_PROC, limit=100, with_vectors=False)
    return [r.payload for r in records if r.payload]


def select_categories_via_llm(
    entries: List[dict], reason: str, groq_client: Groq
) -> List[str]:
    """Ask Groq LLM to select relevant procedure_code_categories for a given reason."""
    entries_text = json.dumps(entries, indent=2)
    prompt = (
        f"You are a medical coding assistant. Given the patient reason/condition below, "
        f"select which procedure_code_category values from the list are relevant.\n\n"
        f"Reason: {reason}\n\n"
        f"Available procedure categories:\n{entries_text}\n\n"
        f"Return only the procedure_code_category values that are relevant to this reason."
    )
    response = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "category_selection",
                "schema": CategorySelection.model_json_schema(),
            },
        },
        model=GROQ_MODEL,
    )
    content = response.choices[0].message.content or ""
    return CategorySelection.model_validate_json(content).selected_categories


async def _pipeline(reason: str, top_k: int, groq_client: Groq) -> List[dict]:
    async with AsyncCortexClient(CORTEX_SERVER) as client:
        entries = await get_procedure_index_entries(client)
        categories = select_categories_via_llm(entries, reason, groq_client)

        query_vector = embed_model.encode(reason).tolist()

        # BtrieveSpaceDriver only supports simple equality filters {"field": "value"}.
        # $or and $in both fail (Error Code 62). Run one search per category and merge.
        seen_codes: set = set()
        all_results: List[dict] = []

        for cat in categories:
            cat_filter = Filter().must(Field("procedure_code_category").eq(cat))
            results = await client.search(
                COLLECTION_CPT,
                query_vector,
                top_k=top_k,
                filter=cat_filter,
                with_payload=True,
            )
            for r in results:
                if r.payload:
                    code = r.payload.get("cpt_code")
                    if code not in seen_codes:
                        seen_codes.add(code)
                        all_results.append(
                            {
                                "cpt_code": code,
                                "procedure_code_category": r.payload.get(
                                    "procedure_code_category"
                                ),
                                "procedure_code_description": r.payload.get(
                                    "procedure_code_description"
                                ),
                                "score": r.score,
                            }
                        )

    all_results.sort(key=lambda x: x["score"], reverse=True)
    return all_results[:top_k]


def search_cpt_by_reason(reason: str, top_k: int = 10, score_threshold: float = 0.5) -> List[dict]:
    """
    Two-stage CPT code retrieval:
    1. Ask Groq to select relevant procedure_code_categories from the procedure_index.
    2. Semantically search cpt_codes filtered to those categories.

    Args:
        reason: Clinical reason or condition (used for both LLM selection and embedding).
        top_k:  Number of CPT code results to return.

    Returns:
        List of dicts with keys: cpt_code, procedure_code_category,
        procedure_code_description, score.
    """
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    results = _loop.run_until_complete(_pipeline(reason, top_k, groq_client))
    return [r for r in results if r["score"] >= score_threshold]
