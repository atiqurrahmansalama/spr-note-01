import React from 'react';
import { BookOpenIcon } from '../../components/ui/Icons';

export default function StudentDiaryFeedCard({ date, lessons = [], evaluations = [], homeworks = [] }) {
  const displayDate = date || new Date().toISOString().split('T')[0];

  return (
    <div className="rounded-xl border theme-border theme-bg-primary overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b theme-border flex items-center justify-between theme-bg-secondary/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md theme-bg-accent/10 theme-text-accent">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold theme-text-primary">Daily Academic Diary</span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full border theme-border font-medium theme-text-secondary">
          {displayDate}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 1. Today's Sabaq / Delivered Lessons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
              Assigned Sabaq & Lessons
            </span>
            <span className="text-xs font-semibold theme-text-accent">{lessons.length} Subjects</span>
          </div>

          {lessons.length === 0 ? (
            <p className="text-xs theme-text-secondary italic py-1">No lessons assigned for this day.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="p-2.5 rounded-lg border theme-border theme-bg-secondary/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold theme-text-primary">{lesson.lesson_title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lesson.period_name && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border theme-border theme-bg-secondary/40 theme-text-primary">
                          {lesson.period_name}
                        </span>
                      )}
                      <span className="text-[11px] font-medium theme-text-secondary">{lesson.subject_name}</span>
                    </div>
                  </div>
                  {lesson.lesson_instructions && (
                    <p className="text-xs theme-text-secondary mt-1 line-clamp-2">{lesson.lesson_instructions}</p>
                  )}
                  {(lesson.start_unit || lesson.end_unit) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] theme-text-accent font-medium">
                      <span>Range:</span>
                      <span>{lesson.start_unit} → {lesson.end_unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Today's Adai / Evaluation Record */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
              Recitation Evaluation
            </span>
            <span className="text-xs font-semibold theme-text-primary">{evaluations.length} Evaluated</span>
          </div>

          {evaluations.length === 0 ? (
            <p className="text-xs theme-text-secondary italic py-1">Recitation pending or not evaluated yet.</p>
          ) : (
            <div className="space-y-2">
              {evaluations.map((ev) => {
                const isMastered = ev.evaluation_status === 'MASTERED';
                const isSatisfactory = ev.evaluation_status === 'SATISFACTORY';

                return (
                  <div key={ev.id} className="p-2.5 rounded-lg border theme-border theme-bg-secondary/20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold theme-text-primary">{ev.student_name}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isMastered
                            ? 'theme-bg-accent/10 theme-text-accent'
                            : isSatisfactory
                            ? 'theme-bg-secondary theme-text-primary'
                            : 'border theme-border theme-text-secondary'
                        }`}
                      >
                        {ev.evaluation_status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs theme-text-secondary">
                      <span>Score: <strong className="theme-text-primary">{ev.score} / {ev.max_score}</strong></span>
                      <span>Mistakes: <strong className="theme-text-primary">{ev.total_mistakes}</strong></span>
                      <span>Stucks: <strong className="theme-text-primary">{ev.total_stucks}</strong></span>
                    </div>

                    {ev.teacher_remarks && (
                      <p className="text-xs italic theme-text-secondary mt-0.5">"{ev.teacher_remarks}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Pending Homework Assignments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
              Homework & Tasks
            </span>
            <span className="text-xs font-semibold theme-text-accent">{homeworks.length} Tasks</span>
          </div>

          {homeworks.length === 0 ? (
            <p className="text-xs theme-text-secondary italic py-1">No homework assigned for this day.</p>
          ) : (
            <div className="space-y-2">
              {homeworks.map((hw) => (
                <div key={hw.id} className="p-2.5 rounded-lg border theme-border theme-bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold theme-text-primary">{hw.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded border theme-border font-medium theme-text-secondary">
                      Due: {hw.due_date} {hw.due_time ? `@ ${hw.due_time}` : ''}
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary mt-1">{hw.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
