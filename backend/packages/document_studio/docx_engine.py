"""
Dynamic DOCX Variable Extraction and Replacement Engine.
"""
from typing import Dict, Any, List
import re


def extract_template_variables(text_content: str) -> List[str]:
    pattern = r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}"
    matches = re.findall(pattern, text_content or "")
    return sorted(list(set(matches)))


def replace_template_variables(text_content: str, context: Dict[str, Any]) -> str:
    result = text_content or ""
    for key, val in (context or {}).items():
        pattern = r"\{\{\s*" + re.escape(str(key)) + r"\s*\}\}"
        result = re.sub(pattern, str(val), result)
    return result
