import os
import shutil
import tempfile
import subprocess
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Standard Paper Sizes in mm
PAGE_SIZE_DIMENSIONS = {
    'A4': {'portrait': '210mm 297mm', 'landscape': '297mm 210mm'},
    'A3': {'portrait': '297mm 420mm', 'landscape': '420mm 297mm'},
    'LEGAL': {'portrait': '8.5in 14in', 'landscape': '14in 8.5in'},
    'LETTER': {'portrait': '8.5in 11in', 'landscape': '11in 8.5in'},
}

# Standard Margins in mm
MARGIN_VALUES = {
    'NORMAL': '12mm',
    'NARROW': '8mm',
    'WIDE': '24mm',
    'NONE': '0mm',
}


def find_chromium_executable() -> Optional[str]:
    """
    Auto-detects Chromium, Google Chrome, or Microsoft Edge executables across
    Windows, Linux (Debian, Ubuntu, RedHat, Alpine), and macOS environments.
    """
    # 1. Check environment variable override
    env_path = os.environ.get('CHROME_BIN') or os.environ.get('CHROMIUM_PATH')
    if env_path and os.path.isfile(env_path) and os.access(env_path, os.X_OK):
        return env_path

    # 2. Candidate executable names on PATH
    candidates_path = [
        'google-chrome',
        'google-chrome-stable',
        'chromium',
        'chromium-browser',
        'msedge',
        'chrome',
    ]
    for c in candidates_path:
        found = shutil.which(c)
        if found:
            return found

    # 3. Known absolute installation paths by OS
    absolute_candidates = [
        # Windows Google Chrome
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.expanduser(r'~\AppData\Local\Google\Chrome\Application\chrome.exe'),
        # Windows Microsoft Edge
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        os.path.expanduser(r'~\AppData\Local\Microsoft\Edge\Application\msedge.exe'),
        # Linux standard locations
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/usr/local/bin/chrome',
        # macOS standard locations
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]

    for p in absolute_candidates:
        if os.path.isfile(p):
            return p

    return None


def wrap_html_for_vector_print(
    body_html: str,
    title: str = 'Official Document',
    page_size: str = 'A4',
    orientation: str = 'PORTRAIT',
    margin: str = 'NORMAL',
    custom_css: str = '',
) -> str:
    """
    Embeds the extracted studio DOM into a pristine, standalone HTML5 document
    configured specifically for 100% Vector Skia PDF generation.
    """
    size_key = str(page_size or 'A4').upper()
    orient_key = str(orientation or 'PORTRAIT').lower()
    margin_key = str(margin or 'NORMAL').upper()

    page_dims = PAGE_SIZE_DIMENSIONS.get(size_key, PAGE_SIZE_DIMENSIONS['A4']).get(
        orient_key, '210mm 297mm'
    )
    margin_val = MARGIN_VALUES.get(margin_key, '12mm')

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    @page {{
      size: {page_dims};
      margin: {margin_val};
    }}
    *, *::before, *::after {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}
    html, body {{
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}
    /* Neutralize screen viewport constraints */
    .paper-sheet {{
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }}
    .print-document-sheet {{
      width: 100% !important;
      min-height: 0 !important;
      background: transparent !important;
    }}
    .print-avoid-break {{
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }}
    .print-table {{
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: auto !important;
    }}
    .print-table th, .print-table td {{
      border: 1px solid #cbd5e1 !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
    }}
    .print-table th {{
      background-color: #f1f5f9 !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }}
    .print-table thead {{
      display: table-header-group !important;
    }}
    .print-table tfoot {{
      display: table-footer-group !important;
    }}
    .print-meta-grid, .print-summary-box {{
      background-color: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }}
    .print-studio-no-print, .print-sidebar-control, .print-topbar-control {{
      display: none !important;
    }}
    {custom_css}
  </style>
</head>
<body>
  {body_html}
</body>
</html>"""


def generate_vector_pdf(
    html_content: str,
    title: str = 'Official Document',
    page_size: str = 'A4',
    orientation: str = 'PORTRAIT',
    margin: str = 'NORMAL',
    custom_css: str = '',
    timeout_seconds: int = 25,
) -> bytes:
    """
    Executes Headless Chromium/Chrome/Edge to generate a 100% pure vector PDF.
    Returns the binary content of the generated PDF.
    """
    chrome_bin = find_chromium_executable()
    if not chrome_bin:
        raise RuntimeError(
            "Headless Chromium, Google Chrome, or Microsoft Edge was not found on the host system. "
            "Please ensure Chrome or Chromium is installed."
        )

    full_html = wrap_html_for_vector_print(
        body_html=html_content,
        title=title,
        page_size=page_size,
        orientation=orientation,
        margin=margin,
        custom_css=custom_css,
    )

    temp_dir = tempfile.mkdtemp(prefix='spr_pdf_')
    temp_html_path = os.path.join(temp_dir, 'document.html')
    temp_pdf_path = os.path.join(temp_dir, 'output.pdf')

    try:
        with open(temp_html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

        cmd = [
            chrome_bin,
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-pdf-header-footer',
            '--run-all-compositor-stages-before-draw',
            f'--print-to-pdf={temp_pdf_path}',
            temp_html_path,
        ]

        logger.info(f"Executing Headless Chrome PDF generation: {chrome_bin}")
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
            check=False,
        )

        if res.returncode != 0:
            stderr_msg = res.stderr.decode('utf-8', errors='ignore')
            logger.error(f"Chromium execution failed with code {res.returncode}: {stderr_msg}")
            raise RuntimeError(f"Headless Chromium PDF generator failed: {stderr_msg}")

        if not os.path.isfile(temp_pdf_path) or os.path.getsize(temp_pdf_path) == 0:
            raise RuntimeError("Chromium finished execution but output PDF was empty or not generated.")

        with open(temp_pdf_path, 'rb') as pdf_file:
            pdf_bytes = pdf_file.read()

        return pdf_bytes

    finally:
        # Secure cleanup of temporary workspace
        shutil.rmtree(temp_dir, ignore_errors=True)
