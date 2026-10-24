export type DocType = 'prescription' | 'lab_report' | 'discharge_summary';

export type Language = 'en' | 'ta' | 'mixed';

export type Flag = 'LOW' | 'NORMAL' | 'HIGH' | 'UNKNOWN';

export type FoodInstruction = 'before_food' | 'after_food' | null;

export type ScheduleParsed = 'morning' | 'afternoon' | 'night';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Medicine {
  name_raw: string;
  generic: string | null;
  strength: string | null;
  schedule_raw: string | null;
  schedule_parsed: ScheduleParsed[];
  food_instruction: FoodInstruction;
  duration_days: number;
  confidence: number;
  bbox: number[] | null;
}

export interface Test {
  name: string;
  loinc: string | null;
  value: number;
  unit: string;
  ref_low: number;
  ref_high: number;
  flag: Flag;
  explanation_en: string | null;
  explanation_ta: string | null;
  confidence: number;
  bbox: number[] | null;
}

export interface Diagnosis {
  text: string;
  confidence: number;
}

export interface Record {
  record_id: string;
  doc_type: DocType;
  doc_date: string | null;
  language: Language;
  patient_name_present: boolean;
  medicines: Medicine[];
  tests: Test[];
  diagnoses: Diagnosis[];
  summary_en: string | null;
  summary_ta: string | null;
  needs_review: string[];
  disclaimer: string;
  error: { code: string; message: string } | null;
}

export interface TimelineItem {
  record_id: string;
  doc_type: DocType;
  doc_date: string;
  status: 'draft' | 'confirmed';
  headline: string;
  medicines: Medicine[];
  tests: Test[];
}

export interface TimelineResponse {
  items: TimelineItem[];
}

export interface TrendPoint {
  date: string;
  value: number;
  flag: Flag;
  record_id: string;
}

export interface TrendsResponse {
  test: string;
  unit: string;
  points: TrendPoint[];
}

export interface Alert {
  type: 'duplicate_generic';
  generic: string;
  medicines: Medicine[];
  record_ids: string[];
  message: string;
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface UploadResponse {
  record_id: string;
  status: 'draft';
  record: Record;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type UploadProgressStep = 'reading' | 'extracting' | 'checking' | 'complete';

export interface UploadProgress {
  step: UploadProgressStep;
  message: string;
}

export * from './sos';

export interface UserAccount {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface IceContactInfo {
  name: string;
  phone: string;
  relation: string;
}

export interface Profile {
  profile_id: string;
  user_id?: string;
  name: string;
  relation: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  ice_contacts: IceContactInfo[];
  abha_id?: string;
  abha_linked_mock?: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  profile_id: string;
  record_id?: string;
  title: string;
  medicine_name?: string;
  dose?: string;
  timing?: string;
  time_of_day?: string;
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface RemindersResponse {
  profile_id: string;
  reminders: Reminder[];
}

export interface AgenticAction {
  id: string;
  action_type: 'CREATE_REMINDERS' | 'DOCTOR_QUESTIONS' | 'REPEAT_TEST_DUE';
  title: string;
  description: string;
  rationale: string;
  suggested_data?: any;
  is_executed?: boolean;
  is_dismissed?: boolean;
}

export interface AgenticActionsResponse {
  profile_id: string;
  actions: AgenticAction[];
}

export interface WellnessRecommendation {
  id: string;
  category: 'DIET' | 'EXERCISE' | 'MONITORING' | 'HYDRATION' | 'LIFESTYLE';
  title: string;
  recommendation: string;
  why_suggested: string;
  disclaimer: string;
}

export interface WellnessResponse {
  profile_id: string;
  patient_name: string;
  recommendations: WellnessRecommendation[];
  disclaimer: string;
}