from django.contrib import admin
from django.urls import path, include, re_path
from django.shortcuts import redirect

def frontend_spa_fallback(request, path=''):
    # Redirect non-API requests from Django backend (port 8000) to React frontend (port 5173)
    if path and not path.startswith(('api/', 'admin/', 'token/', 'register/', 'activity/', 'hifz/')):
        return redirect(f'http://localhost:5173/{path}')
    return redirect('http://localhost:5173/')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    re_path(r'^(?P<path>.*)$', frontend_spa_fallback),
]