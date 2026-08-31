import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.reports import DailyLessonPlan

sys.stdout.reconfigure(encoding='utf-8')

print("\n--- DAILY LESSON PLANS (2026-08-30) ---")
for lp in DailyLessonPlan.objects.filter(lesson_date='2026-08-30'):
    cls_obj = lp.academic_class
    print(f"LESSON: {lp.id} | Title: {lp.lesson_title} | Class FK: {lp.academic_class_id} ({cls_obj.name if cls_obj else 'None'}) | Sec: {lp.section_id}")
