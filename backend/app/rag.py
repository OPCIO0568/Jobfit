import re
from functools import lru_cache
from pathlib import Path

from langchain_core.documents import Document


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "jobfit_knowledge.md"
TOKEN_RE = re.compile(r"[A-Za-z0-9가-힣+#.]+")


def _tokens(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text)}


@lru_cache
def load_documents() -> list[Document]:
    raw = DATA_PATH.read_text(encoding="utf-8")
    sections = [section.strip() for section in raw.split("\n## ") if section.strip()]
    docs: list[Document] = []

    for section in sections:
        title, _, body = section.partition("\n")
        docs.append(
            Document(
                page_content=f"{title}\n{body}".strip(),
                metadata={"source": DATA_PATH.name, "title": title.strip("# ")},
            ),
        )

    return docs


def retrieve_documents(query: str, top_k: int = 3) -> list[Document]:
    query_tokens = _tokens(query)
    scored = []

    for doc in load_documents():
        score = len(query_tokens & _tokens(doc.page_content))
        scored.append((score, doc))

    scored.sort(key=lambda item: item[0], reverse=True)
    matches = [doc for score, doc in scored if score > 0]
    return (matches or [doc for _, doc in scored])[:top_k]
