import fitz  # PyMuPDF


def extract_text_from_pdf(file_path: str) -> str:
    """Opens a PDF and returns all text from every page as one string."""
    try:
        doc = fitz.open(file_path)
        pages_text = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pages_text.append(page.get_text())

        doc.close()

        full_text = "\n".join(pages_text)

        # Remove blank lines and strip whitespace
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]
        return "\n".join(lines)

    except Exception as e:
        raise Exception(f"PDF read failed: {str(e)}")


def extract_text_from_file(file_path: str) -> str:
    """Entry point — handles PDF and plain text files."""
    if file_path.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_path)

    # Fallback: try reading as plain text
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        raise Exception(f"File read failed: {str(e)}")