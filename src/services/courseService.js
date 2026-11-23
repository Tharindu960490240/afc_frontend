import { API_ENDPOINTS } from "../const/const";
import { apiRequest } from "./apiClient";

const C = API_ENDPOINTS.COURSES;

// { campuses: [{id, name, active}], courses: [{id, code, name, specialisation, course_type, cricos_code, duration_weeks, tuition_fee, entry_requirements, campus_ids, active}] }
export const listCourses = () => apiRequest(C.BASE);
export const addCourse = (payload) => apiRequest(C.BASE, { method: "POST", body: payload });
export const saveCourse = (id, payload) => apiRequest(C.ONE(id), { method: "PUT", body: payload });
