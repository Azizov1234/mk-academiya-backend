import { ExamType } from './exam-type';

export type BotFlowStep =
  | 'lead_full_name'
  | 'lead_phone'
  | 'lead_course_type'
  | 'admin_add_username'
  | 'admin_remove_username'
  | 'admin_edit_about'
  | 'admin_edit_address'
  | 'admin_edit_contact'
  | 'admin_course_title'
  | 'admin_course_description'
  | 'student_search'
  | 'result_student_name'
  | 'result_exam_type'
  | 'result_score'
  | 'result_exam_date'
  | 'result_note'
  | 'result_certificate';

export interface LeadDraft {
  fullName?: string;
  phone?: string;
}

export interface ResultDraft {
  studentFullName?: string;
  examType?: ExamType;
  scoreOrLevel?: string;
  examDate?: string;
  note?: string;
}

export interface BotSessionState {
  step?: BotFlowStep;
  leadDraft?: LeadDraft;
  resultDraft?: ResultDraft;
  meta?: Record<string, unknown>;
}
