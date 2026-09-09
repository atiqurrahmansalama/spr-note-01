"""
Examination, Grading & Tabulation Computation Services
"""

from typing import List, Dict, Any


def calculate_exam_tabulation_stats(student_marks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes summary pass/fail ratios, average GPA, and highest mark
    for a class mark sheet.
    """
    if not student_marks:
        return {
            'total_candidates': 0,
            'passed_count': 0,
            'failed_count': 0,
            'pass_percentage': 0.0,
            'highest_marks': 0,
            'average_gpa': 0.0
        }

    total = len(student_marks)
    passed = 0
    failed = 0
    highest = 0.0
    total_gpa = 0.0

    for st in student_marks:
        tot = float(st.get('total_obtained', 0) or 0)
        gpa = float(st.get('overall_gpa', 0) or 0)
        is_pass = st.get('is_passed', True)

        if tot > highest:
            highest = tot
        if is_pass:
            passed += 1
        else:
            failed += 1
        total_gpa += gpa

    pass_pct = round((passed / total * 100), 1) if total > 0 else 0.0
    avg_gpa = round((total_gpa / total), 2) if total > 0 else 0.0

    return {
        'total_candidates': total,
        'passed_count': passed,
        'failed_count': failed,
        'pass_percentage': pass_pct,
        'highest_marks': highest,
        'average_gpa': avg_gpa
    }
