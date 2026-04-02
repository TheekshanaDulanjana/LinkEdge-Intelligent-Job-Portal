import fitz   # This is PyMuPDF — imported as "fitz"


def extract_text_from_pdf(file_path: str) -> str:
    """
    Reads a PDF file and extracts all text from every page.
    Returns the text as a single string.
    """
    try:
        doc = fitz.open(file_path)
        full_text = ""

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            full_text += page.get_text()

        doc.close()

        # Clean up extra whitespace
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]
        return "\n".join(lines)

    except Exception as e:
        raise Exception(f"Could not read PDF: {str(e)}")


def extract_text_from_file(file_path: str) -> str:
    """
    Entry point — handles PDF files.
    In the future you could add .docx support here.
    """
    if file_path.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    else:
        # For non-PDF files, try reading as plain text
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Could not read file: {str(e)}")