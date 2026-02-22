from cortex import AsyncCortexClient, DistanceMetric
from sentence_transformers import SentenceTransformer
import asyncio
import pandas as pd

# Load the Excel file and read the "All 2026 CPT Codes" sheet
df = pd.read_excel("cpt-pcm-nhsn.xlsx")
# Remove the Code Status column
df = df.drop(columns=["Code Status"])

index_df = pd.read_excel("cpt-pcm-nhsn.xlsx", sheet_name=1, engine="openpyxl")
print(f"Rows loaded: {len(index_df)}")
print(f"Columns: {list(index_df.columns)}")

# Load embedding model (384 dimensions)
embed_model = SentenceTransformer("all-MiniLM-L6-v2")
print(
    f"Embedding model loaded — dimension: {embed_model.get_sentence_embedding_dimension()}"
)

# ── Collection 1: cpt_codes (Sheet 0 — 1,164 rows) ──────────────────────────
COLLECTION_CPT = "cpt_codes"
COLLECTION_PROC = "procedure_index"
DIMENSION = 384


async def main():
    async with AsyncCortexClient("localhost:50051") as client:
        # Create collection (idempotent — safe to re-run)
        await client.get_or_create_collection(
            COLLECTION_CPT, dimension=DIMENSION, distance_metric=DistanceMetric.COSINE
        )

        # Prepare data — handle NaN and ensure CPT codes are strings
        df["Procedure Code Descriptions"] = df["Procedure Code Descriptions"].fillna("")
        df["CPT Codes"] = df["CPT Codes"].astype(str)

        descriptions_cpt = df["Procedure Code Descriptions"].tolist()

        # Embed all procedure descriptions
        print(f"Embedding {len(descriptions_cpt)} CPT procedure descriptions...")
        embeddings_cpt = embed_model.encode(descriptions_cpt, show_progress_bar=True)

        # Build metadata payloads for filtering
        payloads_cpt = [
            {
                "procedure_code_category": row["Procedure Code Category"],
                "cpt_code": row["CPT Codes"],
                "procedure_code_description": row["Procedure Code Descriptions"],
            }
            for _, row in df.iterrows()
        ]

        # Batch upsert into Actian VectorAI
        ids_cpt = list(range(len(df)))
        vectors_cpt = [emb.tolist() for emb in embeddings_cpt]

        await client.batch_upsert(COLLECTION_CPT, ids_cpt, vectors_cpt, payloads_cpt)  # type: ignore[arg-type]
        print(f"✓ Upserted {len(ids_cpt)} vectors into '{COLLECTION_CPT}'")

        # ── Collection 2: procedure_index (Sheet 1 — 39 rows) ────────────────────────
        await client.get_or_create_collection(
            COLLECTION_PROC, dimension=DIMENSION, distance_metric=DistanceMetric.COSINE
        )

        # Normalize the double-space column name from the Excel sheet
        index_df.columns = [c.strip().replace("  ", " ") for c in index_df.columns]

        # Prepare data
        index_df["Procedure Description"] = index_df["Procedure Description"].fillna("")
        descriptions_proc = index_df["Procedure Description"].tolist()

        # Embed procedure descriptions
        print(f"Embedding {len(descriptions_proc)} procedure index descriptions...")
        embeddings_proc = embed_model.encode(descriptions_proc, show_progress_bar=True)

        # Build metadata payloads
        payloads_proc = [
            {
                "procedure_code_category": row["Procedure Code Category"],
                "operative_procedure": row["Operative Procedure"],
                "procedure_description": row["Procedure Description"],
            }
            for _, row in index_df.iterrows()
        ]

        # Batch upsert
        ids_proc = list(range(len(index_df)))
        vectors_proc = [emb.tolist() for emb in embeddings_proc]

        await client.batch_upsert(COLLECTION_PROC, ids_proc, vectors_proc, payloads_proc)  # type: ignore[arg-type]
        print(f"✓ Upserted {len(ids_proc)} vectors into '{COLLECTION_PROC}'")


if __name__ == "__main__":
    asyncio.run(main())
