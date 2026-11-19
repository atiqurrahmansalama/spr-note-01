import { fetchWithAuth } from '../utils/authService';

// ─── Academic Goals API ───────────────────────────────────────────────────────
export async function getAcademicGoals(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/api/v1/academic/goals/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch academic goals');
  return res.json();
}

export async function createAcademicGoal(data) {
  const res = await fetchWithAuth('/api/v1/academic/goals/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create academic goal');
  return res.json();
}

export async function updateAcademicGoal(id, data) {
  const res = await fetchWithAuth(`/api/v1/academic/goals/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update academic goal');
  return res.json();
}

export async function updateGoalProgress(id, current_progress, notes = '') {
  const res = await fetchWithAuth(`/api/v1/academic/goals/${id}/update-progress/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_progress, notes }),
  });
  if (!res.ok) throw new Error('Failed to update goal progress');
  return res.json();
}

export async function deleteAcademicGoal(id) {
  const res = await fetchWithAuth(`/api/v1/academic/goals/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete academic goal');
  return true;
}

// ─── Daily Lesson Plans API ──────────────────────────────────────────────────
export async function getDailyLessons(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/api/v1/learning/daily-lessons/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch daily lessons');
  return res.json();
}

export async function createDailyLesson(data) {
  const res = await fetchWithAuth('/api/v1/learning/daily-lessons/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create daily lesson');
  return res.json();
}

export async function updateDailyLesson(id, data) {
  const res = await fetchWithAuth(`/api/v1/learning/daily-lessons/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update daily lesson');
  return res.json();
}

export async function deleteDailyLesson(id) {
  const res = await fetchWithAuth(`/api/v1/learning/daily-lessons/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete daily lesson');
  return true;
}

export async function bulkEvaluateLesson(lessonId, evaluations) {
  const res = await fetchWithAuth(`/api/v1/learning/daily-lessons/${lessonId}/bulk-evaluate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluations }),
  });
  if (!res.ok) throw new Error('Failed to submit bulk evaluations');
  return res.json();
}

// ─── Lesson Evaluations API ──────────────────────────────────────────────────
export async function getLessonEvaluations(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/api/v1/learning/evaluations/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch evaluations');
  return res.json();
}

export async function saveLessonEvaluation(data) {
  const method = data.id ? 'PATCH' : 'POST';
  const url = data.id ? `/api/v1/learning/evaluations/${data.id}/` : '/api/v1/learning/evaluations/';
  const res = await fetchWithAuth(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save evaluation');
  return res.json();
}

export async function deleteLessonEvaluation(id) {
  const res = await fetchWithAuth(`/api/v1/learning/evaluations/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete evaluation');
  return true;
}

// ─── Homework Assignments API ────────────────────────────────────────────────
export async function getHomeworkAssignments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/api/v1/learning/homeworks/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch homework assignments');
  return res.json();
}

export async function createHomeworkAssignment(data) {
  const res = await fetchWithAuth('/api/v1/learning/homeworks/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create homework assignment');
  return res.json();
}

export async function updateHomeworkAssignment(id, data) {
  const res = await fetchWithAuth(`/api/v1/learning/homeworks/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update homework assignment');
  return res.json();
}

export async function deleteHomeworkAssignment(id) {
  const res = await fetchWithAuth(`/api/v1/learning/homeworks/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete homework assignment');
  return true;
}

export async function evaluateHomeworkSubmission(submissionId, marks, feedback) {
  const res = await fetchWithAuth(`/api/v1/learning/homework-submissions/${submissionId}/evaluate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ obtained_marks: marks, teacher_feedback: feedback }),
  });
  if (!res.ok) throw new Error('Failed to evaluate homework submission');
  return res.json();
}

// ─── Multi-Period Report Analytics API ───────────────────────────────────────
export async function getMultiPeriodReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/api/v1/learning/reports/multi-period-summary/${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch report summary');
  return res.json();
}
