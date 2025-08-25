import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"
import time
import hashlib
from typing import List, Tuple

import numpy as np

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings


# Hard-code the Pinecone API key placeholder as requested. Paste your key later.
PINECONE_API_KEY = "pcsk_6DV9tP_LzEPbtBiPyRZhuNMRVzsTqGBKkNRSqaXesScvPnG4iGRJp3hzFpCTL5gt5gpKyy"

# Basic configuration
INDEX_NAME = "rag-test"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SUBJECT = "storia"


def load_and_chunk_pdf(
    pdf_path: str,
    chunk_size: int = 768,
    chunk_overlap: int = 90,
) -> List[Document]:
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    chunked_docs: List[Document] = splitter.split_documents(pages)

    enriched_docs: List[Document] = []
    for idx, doc in enumerate(chunked_docs):
        metadata = dict(doc.metadata or {})
        metadata.update(
            {
                "source": os.path.basename(pdf_path),
                "chunk_index": idx,
                "subject": SUBJECT,
            }
        )
        enriched_docs.append(Document(page_content=doc.page_content, metadata=metadata))
    return enriched_docs


def get_bge_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="BAAI/bge-base-en-v1.5",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def _stable_id_for_document(doc: Document) -> str:
    hasher = hashlib.sha256()
    hasher.update((doc.metadata.get("source", "") + "|" + str(doc.metadata.get("page", "")) + "|" + str(doc.metadata.get("chunk_index", ""))).encode("utf-8"))
    return hasher.hexdigest()


def ensure_pinecone_index(index_name: str, dimension: int = 768) -> None:
    if PINECONE_API_KEY == "...":
        return
    try:
        from pinecone import Pinecone, ServerlessSpec
    except Exception as e:
        raise RuntimeError("pinecone package is required. Install `pinecone`.") from e

    pc = Pinecone(api_key=PINECONE_API_KEY)

    exists = True
    try:
        pc.describe_index(index_name)
    except Exception:
        exists = False

    if not exists:
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        time.sleep(2)


def upsert_documents_to_pinecone(docs: List[Document], index_name: str) -> None:
    if PINECONE_API_KEY == "...":
        return
    from langchain_pinecone import PineconeVectorStore

    embeddings = get_bge_embeddings()
    vector_store = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        pinecone_api_key=PINECONE_API_KEY,
    )
    ids = [_stable_id_for_document(d) for d in docs]
    vector_store.add_documents(documents=docs, ids=ids)


def pinecone_search(query: str, k: int = 5) -> List[Document]:
    if PINECONE_API_KEY == "...":
        raise RuntimeError("Set your Pinecone API key in PINECONE_API_KEY before using pinecone_search.")
    from langchain_pinecone import PineconeVectorStore

    embeddings = get_bge_embeddings()
    vector_store = PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings,
        pinecone_api_key=PINECONE_API_KEY,
    )
    return vector_store.similarity_search(query, k=k)


def pinecone_search_filtered(query: str, source_filename: str, k: int = 5) -> List[Document]:
    if PINECONE_API_KEY == "...":
        raise RuntimeError("Set your Pinecone API key in PINECONE_API_KEY before using pinecone_search_filtered.")
    from langchain_pinecone import PineconeVectorStore

    embeddings = get_bge_embeddings()
    vector_store = PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings,
        pinecone_api_key=PINECONE_API_KEY,
    )
    # Metadata filter on the 'source' field, which stores the basename of the PDF file
    return vector_store.similarity_search(query, k=k, filter={"source": os.path.basename(source_filename)})


def _list_pdf_files(data_dir: str) -> List[str]:
    if not os.path.isdir(data_dir):
        return []
    return [
        os.path.join(data_dir, f)
        for f in os.listdir(data_dir)
        if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(data_dir, f))
    ]


def ingest() -> None:
    pdf_paths = _list_pdf_files(DATA_DIR)
    if not pdf_paths:
        raise FileNotFoundError(f"No PDF files found in {DATA_DIR}")

    ensure_pinecone_index(INDEX_NAME, dimension=768)

    total_docs = 0
    for pdf_path in pdf_paths:
        try:
            docs = load_and_chunk_pdf(pdf_path)
            if not docs:
                continue
            upsert_documents_to_pinecone(docs, INDEX_NAME)
            total_docs += len(docs)
        except Exception as e:
            # Skip problematic files but continue ingesting others
            print(f"Warning: failed to ingest {pdf_path}: {e}")
    print(f"Ingested {total_docs} chunks from {len(pdf_paths)} file(s) into index '{INDEX_NAME}'.")


if __name__ == "__main__":
    ingest()
    if PINECONE_API_KEY == "...":
        print("Ingest complete (offline mode: Pinecone API key not set). You can still run offline tests.")
    else:
        print(f"Ingest complete to Pinecone index `{INDEX_NAME}`.")