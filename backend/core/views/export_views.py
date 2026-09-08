import re
import logging
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse

from core.pdf_export_service import generate_vector_pdf

logger = logging.getLogger(__name__)


def sanitize_filename(name: str, ext: str = 'pdf') -> str:
    safe = re.sub(r'[/\\?%*:|"<>]+', '_', name or 'Official_Document')
    safe = re.sub(r'\s+', '_', safe)
    safe = re.sub(r'_+', '_', safe).strip('_')
    return f"{safe or 'Document'}.{ext}"


class VectorPDFExportAPIView(APIView):
    """
    Dedicated 1-Click Server-Side Headless Chromium Vector PDF Generation API.
    Converts full application DOM + CSS directly into a 100% Vector PDF with
    selectable text, vector paths, and infinite resolution without any canvas rasterization.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Generate 100% Vector PDF via Headless Chromium",
        description="Receives rendered HTML/CSS payload and returns a direct vector PDF attachment.",
        responses={
            200: OpenApiResponse(description="Direct PDF binary file stream"),
            400: OpenApiResponse(description="Missing required HTML payload"),
            500: OpenApiResponse(description="PDF rendering engine error"),
        }
    )
    def post(self, request, *args, **kwargs):
        html_content = request.data.get('html') or request.data.get('body')
        if not html_content or not str(html_content).strip():
            return Response(
                {"error": "Missing or empty 'html' payload in request body."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = request.data.get('title', 'Official_Document')
        page_size = request.data.get('pageSize') or request.data.get('page_size', 'A4')
        orientation = request.data.get('orientation', 'PORTRAIT')
        margin = request.data.get('margin', 'NORMAL')
        custom_css = request.data.get('customCss') or request.data.get('custom_css', '')

        try:
            pdf_bytes = generate_vector_pdf(
                html_content=html_content,
                title=title,
                page_size=page_size,
                orientation=orientation,
                margin=margin,
                custom_css=custom_css,
            )

            filename = sanitize_filename(title, 'pdf')
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response

        except Exception as e:
            logger.exception(f"Vector PDF export generation failed: {e}")
            return Response(
                {"error": f"Vector PDF generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
