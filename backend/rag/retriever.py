import hashlib
import logging
import math
import re
import warnings
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Protocol

from .loader import DocumentChunk, split_markdown_chunks

try:
    from backend.app.config import get_settings
except ModuleNotFoundError:
    from app.config import get_settings  # type: ignore[no-redef]


logger = logging.getLogger(__name__)
TOKEN_RE = re.compile(r"[A-Za-z0-9가-힣+#.]+")


class EmbeddingProvider(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        ...

    def embed_query(self, text: str) -> list[float]:
        ...


class OpenAIEmbeddingProvider:
    def __init__(self) -> None:
        settings = get_settings()
        from langchain_openai import OpenAIEmbeddings

        self._client = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._client.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._client.embed_query(text)


class HashEmbeddingProvider:
    """Offline fallback embedding so RAG can run without an OpenAI API key."""

    def __init__(self, dimensions: int = 384) -> None:
        self.dimensions = dimensions

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions

        for token in TOKEN_RE.findall(text.lower()):
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector


@dataclass
class RetrieverStore:
    collection: Any
    embedder: EmbeddingProvider
    chunks: list[DocumentChunk]


def retrieve_jobfit_context(query: str, k: int = 4) -> list[str]:
    if not query.strip():
        _warn("RAG query is empty.")
        return []

    try:
        store = _get_store()
        if not store.chunks:
            _warn("No RAG documents were loaded.")
            return []

        query_embedding = store.embedder.embed_query(query)
        result = store.collection.query(
            query_embeddings=[query_embedding],
            n_results=len(store.chunks),
            include=["documents", "metadatas"],
        )

        pairs = _rerank_by_keywords(
            query,
            list(zip(result.get("documents", [[]])[0], result.get("metadatas", [[]])[0])),
        )

        return [
            _format_context(document, metadata)
            for document, metadata in pairs[:k]
            if document
        ]
    except Exception as exc:
        _warn(f"RAG retrieval failed: {exc.__class__.__name__}")
        return []


@lru_cache(maxsize=1)
def _get_store() -> RetrieverStore:
    chunks = split_markdown_chunks()

    try:
        import chromadb
    except Exception as exc:
        _warn(f"Chroma import failed: {exc.__class__.__name__}")
        return RetrieverStore(collection=_EmptyCollection(), embedder=HashEmbeddingProvider(), chunks=[])

    embedder = _build_embedder()
    texts = [chunk.content for chunk in chunks]
    embeddings = _embed_documents(embedder, texts)

    if embeddings is None:
        embedder = HashEmbeddingProvider()
        embeddings = embedder.embed_documents(texts)

    client = chromadb.EphemeralClient()
    collection = client.create_collection(name="jobfit_rag_documents")

    if chunks:
        collection.add(
            ids=[chunk.chunk_id for chunk in chunks],
            documents=texts,
            embeddings=embeddings,
            metadatas=[
                {
                    "source": chunk.source,
                    "title": chunk.title,
                }
                for chunk in chunks
            ],
        )

    return RetrieverStore(collection=collection, embedder=embedder, chunks=chunks)


def _build_embedder() -> EmbeddingProvider:
    settings = get_settings()
    if settings.jobfit_backend_mock or not settings.openai_api_key:
        return HashEmbeddingProvider()

    try:
        return OpenAIEmbeddingProvider()
    except Exception as exc:
        _warn(f"OpenAI embedding setup failed, using fallback: {exc.__class__.__name__}")
        return HashEmbeddingProvider()


def _embed_documents(embedder: EmbeddingProvider, texts: list[str]) -> list[list[float]] | None:
    try:
        return embedder.embed_documents(texts)
    except Exception as exc:
        _warn(f"Embedding generation failed, using fallback: {exc.__class__.__name__}")
        return None


def _format_context(document: str, metadata: dict[str, Any] | None) -> str:
    metadata = metadata or {}
    source = metadata.get("source", "unknown")
    title = metadata.get("title", "Untitled")
    return f"[source: {source} | title: {title}]\n{document}"


def _rerank_by_keywords(
    query: str,
    pairs: list[tuple[str, dict[str, Any] | None]],
) -> list[tuple[str, dict[str, Any] | None]]:
    query_tokens = set(TOKEN_RE.findall(query.lower()))
    if not query_tokens:
        return pairs

    return [
        pair
        for _, pair in sorted(
            enumerate(pairs),
            key=lambda item: (
                _keyword_score(query_tokens, item[1][0], item[1][1]),
                -item[0],
            ),
            reverse=True,
        )
    ]


def _keyword_score(
    query_tokens: set[str],
    document: str,
    metadata: dict[str, Any] | None,
) -> int:
    metadata = metadata or {}
    title = str(metadata.get("title", ""))
    source = str(metadata.get("source", ""))
    text = f"{document}\n{title}\n{title}\n{source}".lower()
    return len(query_tokens & set(TOKEN_RE.findall(text)))


def _warn(message: str) -> None:
    logger.warning(message)
    warnings.warn(message, RuntimeWarning, stacklevel=2)


class _EmptyCollection:
    def query(self, **_: Any) -> dict[str, list[list[Any]]]:
        return {"documents": [[]], "metadatas": [[]]}
