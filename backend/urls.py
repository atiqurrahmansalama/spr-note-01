import os
import mimetypes
from django.contrib import admin
from django.urls import path, include, re_path
from django.shortcuts import redirect
from django.conf import settings
from django.http import Http404, FileResponse

# Explicitly register standard MIME types to avoid Windows registry inconsistencies
mimetypes.add_type('application/pdf', '.pdf')
mimetypes.add_type('image/jpeg', '.jpeg')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('application/msword', '.doc')
mimetypes.add_type('application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx')
mimetypes.add_type('application/vnd.ms-excel', '.xls')
mimetypes.add_type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx')
mimetypes.add_type('text/csv', '.csv')

def serve_media_file(request, path):
    # Normalize path
    clean_path = path.lstrip('/')
    
    candidate_paths = [
        os.path.join(settings.BASE_DIR, clean_path),
        os.path.join(settings.BASE_DIR, 'media', clean_path),
        os.path.join(settings.BASE_DIR, 'students', clean_path),
    ]

    for fpath in candidate_paths:
        if os.path.isfile(fpath):
            content_type, _ = mimetypes.guess_type(fpath)
            content_type = content_type or 'application/octet-stream'
            fname = os.path.basename(fpath)
            response = FileResponse(open(fpath, 'rb'), content_type=content_type)
            response['Access-Control-Allow-Origin'] = '*'
            response['Content-Disposition'] = f'inline; filename="{fname}"'
            response['X-Frame-Options'] = 'SAMEORIGIN'
            return response

    raise Http404(f"Media file '{path}' not found")

def frontend_spa_fallback(request, path=''):
    # Redirect non-API requests from Django backend (port 8000) to React frontend (port 5173)
    if path and not path.startswith(('api/', 'admin/', 'token/', 'register/', 'activity/', 'hifz/', 'media/', 'static/')):
        return redirect(f'http://localhost:5173/{path}')
    return redirect('http://localhost:5173/')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    re_path(r'^media/(?P<path>.*)$', serve_media_file),
    re_path(r'^(?P<path>.*)$', frontend_spa_fallback),
]