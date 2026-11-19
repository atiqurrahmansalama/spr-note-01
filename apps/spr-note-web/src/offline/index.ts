/**
 * TaleemOS / SPR Note ERP — Central Offline Data Layer
 * ====================================================
 * Unified entry point re-exporting the Dexie database, Universal Outbox,
 * Tenant Isolation Manager, and BaseRepository.
 */

export * from "./types";
export * from "./db";
export * from "./tenantManager";
export * from "./outboxManager";
export * from "./baseRepository";
export * from "./syncWorker";
export * from "./errorParser";

import { BaseRepository } from "./baseRepository";

/**
 * Pre-instantiated standard repositories for target enterprise modules
 */
export const attendanceRepository = new BaseRepository("attendance");
export const examsRepository = new BaseRepository("exams");
export const dailyProgressRepository = new BaseRepository("daily-progress");
export const lessonsRepository = new BaseRepository("daily-lessons");
export const evaluationsRepository = new BaseRepository("lesson-evaluations");
export const studentsRepository = new BaseRepository("students");
export const doclabRepository = new BaseRepository("doclab");
