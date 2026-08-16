import axiosInstance from './axios';

/**
 * Calendar Events API Services
 */
export const getCalendarEvents = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/calendar/events/', { params });
  return res.data;
};

export const createCalendarEvent = async (data) => {
  const res = await axiosInstance.post('/api/v1/calendar/events/', data);
  return res.data;
};

export const updateCalendarEvent = async (id, data) => {
  const res = await axiosInstance.patch(`/api/v1/calendar/events/${id}/`, data);
  return res.data;
};

export const deleteCalendarEvent = async (id) => {
  const res = await axiosInstance.delete(`/api/v1/calendar/events/${id}/`);
  return res.data;
};

export const checkHoliday = async (date) => {
  const res = await axiosInstance.get('/api/v1/calendar/events/check-holiday/', {
    params: { date },
  });
  return res.data;
};

/**
 * Institutional Tasks (To-Do) API Services
 */
export const getInstitutionalTasks = async (params = {}) => {
  const res = await axiosInstance.get('/api/v1/calendar/tasks/', { params });
  return res.data;
};

export const createInstitutionalTask = async (data) => {
  const res = await axiosInstance.post('/api/v1/calendar/tasks/', data);
  return res.data;
};

export const updateInstitutionalTask = async (id, data) => {
  const res = await axiosInstance.patch(`/api/v1/calendar/tasks/${id}/`, data);
  return res.data;
};

export const deleteInstitutionalTask = async (id) => {
  const res = await axiosInstance.delete(`/api/v1/calendar/tasks/${id}/`);
  return res.data;
};

export const toggleTaskComplete = async (id) => {
  const res = await axiosInstance.patch(`/api/v1/calendar/tasks/${id}/toggle-complete/`);
  return res.data;
};
