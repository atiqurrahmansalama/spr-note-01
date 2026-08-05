from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

class FlexibleJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that falls back gracefully to Anonymous User 
    instead of raising a 401 error when an expired or invalid token is passed 
    on public endpoints.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None
