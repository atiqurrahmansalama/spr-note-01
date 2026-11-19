"""
Reusable Headless Chrome & Print PDF Generation Engine.
Supports A4, A3, Legal, Letter with precision CSS print media layout.
"""
import os
import shutil
import tempfile
import subprocess
import logging
from typing import Optional, Dict

logger = logging.getLogger("core")

PAGE_SIZE_DIMENSIONS: Dict[str, Dict[str, str]] = {
    "A4": {"portrait": "210mm 297mm", "landscape": "297mm 210mm"},
    "A3": {"portrait": "297mm 420mm", "landscape": "420mm 297mm"},
    "LEGAL": {"portrait": "8.5in 14in", "landscape": "14in 8.5in"},
    "LETTER": {"portrait": "8.5in 11in", "landscape": "11in 8.5in"},
}


def find_browser_executable() -> Optional[str]:
    env_override = os.environ.get("CHROME_BIN") or os.environ.get("CHROMIUM_PATH")
    if env_override and os.path.isfile(env_override):
        return env_override

    candidates = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge", "chrome"]
    for c in candidates:
        found = shutil.which(c)
        if found:
            return found
    return None


def convert_html_to_pdf(html_content: str, output_path: str) -> bool:
    browser = find_browser_executable()
    if not browser:
        logger.warning("[PDFEngine] No headless browser found on system PATH.")
        return False

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as temp_html:
        temp_html.write(html_content)
        temp_html_path = temp_html.name

    try:
        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output_path}",
            temp_html_path,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        return os.path.isfile(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        logger.error(f"[PDFEngine] Failed to render PDF: {e}")
        return False
    finally:
        if os.path.exists(temp_html_path):
            try:
                os.remove(temp_html_path)
            except OSError:
                pass
