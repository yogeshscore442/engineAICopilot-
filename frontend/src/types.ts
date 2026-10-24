export type DocumentType = 'prescription' | 'lab_report';
export type ImageQuality = 'good' | 'average' | 'poor' | null;
export type Confidence = 'high' | 'medium' | 'low';
export type Flag = 'normal' | 'high' | 'low' | 'abnormal' | null;
export type FoodRelation = 'Before food' | 'After food' | 'With food' | null;

export interface Patient {
  name: string | null;
  age: string | null;
  gender: string | null;
  id: string | null;
}

export interface Medicine {
  name: string | null;
  strength: string | null;
  form: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  confidence: Confidence;
  uncertain_text: string | null;
}

export interface Prescription {
  doctor_name: string | null;
  registration_no: string | null;
  clinic_or_hospital: string | null;
  date: string | null;
  diagnosis: string | null;
  advice: string | null;
  follow_up: string | null;
  medicines: Medicine[];
}

export interface LabTest {
  name: string | null;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
  flag: Flag;
  confidence: Confidence;
}

export interface LabReport {
  lab_name: string | null;
  collection_date: string | null;
  report_date: string | null;
  referred_by: string | null;
  remarks: string | null;
  tests: LabTest[];
}

export interface ScheduleSlot {
  morning?: string;
  afternoon?: string;
  evening?: string;
  night?: string;
  [key: string]: string | undefined;
}

export interface ScheduleRow {
  index: number;
  name: string;
  strength: string | null;
  form: string | null;
  dosage: string | null;
  frequency_raw: string | null;
  duration_raw: string | null;
  slots: ScheduleSlot;
  as_needed: boolean;
  parsed: boolean;
  assumed_times: boolean;
  qty_assumed: boolean;
  food: FoodRelation;
  per_day: number;
  duration_days: number | null;
  end_date: string | null;
  total_units: string | null;
  unit: string | null;
  needs_check: boolean;
}

export interface SignatureBundle {
  signature: string;
  sig_alg: string;
  signer_fingerprint: string;
  timestamp: string;
  data_digest: string;
  session_id: string;
}

export interface AnalyzeResponse {
  valid: boolean;
  document_type: DocumentType;
  reason: string;
  image_quality: ImageQuality;
  needs_human_review: boolean;
  review_notes: string[];
  patient: Patient;
  prescription?: Prescription;
  lab_report?: LabReport;
  full_text: string;
  schedule: ScheduleRow[];
  session_id: string;
  signature_bundle?: SignatureBundle;
}

export interface StoreLink {
  store: string;
  url: string;
}

export interface Card {
  type: 'purchase' | 'images';
  medicine: string;
  strength: string | null;
  in_prescription: boolean;
  form?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  uncertain?: boolean;
  uncertain_text?: string | null;
  links: StoreLink[];
}

export interface ChatResponse {
  reply: string;
  cards: Card[];
}

export interface LinksResponse {
  cards: Card[];
}

export interface SummaryResponse {
  summary: string;
  session_id?: string;
  signature_bundle?: SignatureBundle;
}

export interface HealthResponse {
  status: string;
  api_key_configured?: boolean;
  last_working_model?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: Card[];
  timestamp: Date;
  isEmergency?: boolean;
}

export type Step = 'upload' | 'review' | 'copilot' | 'summary' | 'map';

export interface ApiErrorDetail {
  valid?: boolean;
  message: string;
  reason?: string;
  code?: number;
}
