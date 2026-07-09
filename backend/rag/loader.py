from dataclasses import dataclass
from pathlib import Path


DOCUMENTS_DIR = Path(__file__).resolve().parent / "documents"


@dataclass(frozen=True)
class MarkdownDocument:
    source: str
    title: str
    content: str


@dataclass(frozen=True)
class DocumentChunk:
    chunk_id: str
    source: str
    title: str
    content: str


def load_markdown_documents() -> list[MarkdownDocument]:
    documents: list[MarkdownDocument] = []

    for path in sorted(DOCUMENTS_DIR.glob("*.md")):
        content = path.read_text(encoding="utf-8").strip()
        if not content:
            continue

        first_line = content.splitlines()[0].lstrip("# ").strip()
        documents.append(
            MarkdownDocument(
                source=path.name,
                title=first_line or path.stem,
                content=content,
            ),
        )

    return documents


def split_markdown_chunks(max_chars: int = 1_200) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []

    for document in load_markdown_documents():
        sections = _split_sections(document.content)

        for index, section in enumerate(sections):
            for part_index, content in enumerate(_split_long_text(section, max_chars)):
                chunks.append(
                    DocumentChunk(
                        chunk_id=f"{document.source}:{index}:{part_index}",
                        source=document.source,
                        title=document.title,
                        content=content,
                    ),
                )

    return chunks


def _split_sections(content: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []

    for line in content.splitlines():
        if line.startswith("## ") and current:
            parts.append("\n".join(current).strip())
            current = []
        current.append(line)

    if current:
        parts.append("\n".join(current).strip())

    return [part for part in parts if part]


def _split_long_text(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
    parts: list[str] = []
    current = ""

    for paragraph in paragraphs:
        next_text = f"{current}\n\n{paragraph}".strip()
        if current and len(next_text) > max_chars:
            parts.append(current)
            current = paragraph
        else:
            current = next_text

    if current:
        parts.append(current)

    return parts
