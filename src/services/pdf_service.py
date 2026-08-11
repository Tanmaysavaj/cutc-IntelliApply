import fitz


class PDFService:
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        try:
            document = fitz.open(pdf_path)

            text = ""

            for page in document:
                text += page.get_text()
                text += "\n"

            document.close()

            return text.strip()

        except Exception as e:
            raise RuntimeError(f"Failed to extract text from '{pdf_path}': {e}")