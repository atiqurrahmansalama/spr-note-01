import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import CommunicationSetting

setting = CommunicationSetting.objects.first()
token = setting.whatsapp_meta_access_token
phone_id = setting.whatsapp_meta_phone_id

url = f"https://graph.facebook.com/v21.0/{phone_id}?fields=whatsapp_business_account"
res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
print("WABA response:", res.json())

waba_id = res.json().get('whatsapp_business_account', {}).get('id')
if waba_id:
    # Check templates
    t_url = f"https://graph.facebook.com/v21.0/{waba_id}/message_templates"
    t_res = requests.get(t_url, headers={"Authorization": f"Bearer {token}"})
    print("Templates:", t_res.json())

    # Check conversation analytics / messages
    c_url = f"https://graph.facebook.com/v21.0/{waba_id}?fields=id,name,currency,timezone_id,message_template_namespace"
    c_res = requests.get(c_url, headers={"Authorization": f"Bearer {token}"})
    print("WABA Details:", c_res.json())
