import axiosInstance from './axios';

/**
 * Attendance Session / Period Slots API Services
 */
export const getAttendanceSlots = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/attendance/slots/', { params });
  return res.data;
};

export const createAttendanceSlot = async (data) => {
  const res = await axiosInstance.post('/api/v1/attendance/slots/', data);
  return res.data;
};

export const updateAttendanceSlot = async (id, data) => {
  const res = await axiosInstance.patch(`/api/v1/attendance/slots/${id}/`, data);
  return res.data;
};

export const deleteAttendanceSlot = async (id) => {
  const res = await axiosInstance.delete(`/api/v1/attendance/slots/${id}/`);
  return res.data;
};

/**
 * Student Attendance & Roll Call API Services
 */
export const getStudentAttendance = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/attendance/students/', { params });
  return res.data;
};

export const bulkMarkStudentAttendance = async (data) => {
  const res = await axiosInstance.post('/api/v1/attendance/students/bulk-mark/', data);
  return res.data;
};

export const getStudentAttendanceSummary = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/attendance/students/daily-summary/', { params });
  return res.data;
};

export const getMonthlyAttendanceMatrix = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/attendance/students/monthly-matrix/', { params });
  return res.data;
};

export const getTeacherAttendanceMatrix = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/attendance/students/teacher-monthly-matrix/', { params });
  return res.data;
};

/**
 * Attendance Policy & Weekend Settings API Services
 */
export const getAttendancePolicy = async () => {
  const res = await axiosInstance.get('/api/v1/attendance/policy/');
  return res.data;
};

export const updateAttendancePolicy = async (data) => {
  const res = await axiosInstance.post('/api/v1/attendance/policy/', data);
  return res.data;
};
