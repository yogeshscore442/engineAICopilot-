import type {
  TimelineResponse,
  TrendsResponse,
  AlertsResponse,
  UploadResponse,
  ApiError,
  Record as RecordType,
  UploadProgress,
  EmergencyProfileOut,
  SosEvent,
  SosAlertCreate,
  UserAccount,
  Profile,
  Reminder,
  RemindersResponse,
  AgenticAction,
  AgenticActionsResponse,
  WellnessRecommendation,
  WellnessResponse,
} from '../types';

export type {
  UploadProgress,
  EmergencyProfileOut,
  SosEvent,
  SosAlertCreate,
  UserAccount,
  Profile,
  Reminder,
  AgenticAction,
  WellnessRecommendation,
};

function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000/api';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const err = (await res.json()) as any;
      message = err.error?.message || err.detail?.error?.message || err.detail || message;
    } catch {
      message = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw { error: { code: `HTTP_${res.status}`, message } } as ApiError;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth & Account ──
  async register(email: string, password: string, name: string): Promise<{ user: UserAccount; token: string; profiles: Profile[] }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async login(email: string, password: string): Promise<{ user: UserAccount; token: string; profiles: Profile[] }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(userId: string): Promise<{ user: UserAccount; token: string; profiles: Profile[] }> {
    return request(`/auth/me?user_id=${encodeURIComponent(userId)}`);
  },

  // ── Profiles ──
  async listProfiles(userId?: string): Promise<Profile[]> {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return request<Profile[]>(`/profiles${query}`);
  },

  async getProfile(profileId: string): Promise<Profile> {
    return request<Profile>(`/profiles/${profileId}`);
  },

  async createProfile(data: {
    name: string;
    relation: string;
    user_id?: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    allergies?: string;
    ice_contacts?: Array<{ name: string; phone: string; relation: string }>;
    abha_id?: string;
  }): Promise<Profile> {
    return request<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProfile(profileId: string, data: Partial<Profile>): Promise<Profile> {
    return request<Profile>(`/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProfile(profileId: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/profiles/${profileId}`, {
      method: 'DELETE',
    });
  },

  // ── Records Upload & Extraction ──
  async uploadRecord(file: File, onProgress?: (progress: UploadProgress) => void, profileId: string = 'default'): Promise<UploadResponse> {
    onProgress?.({ step: 'reading', message: 'Reading document bytes and verifying security...' });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lang', 'en');

      onProgress?.({ step: 'extracting', message: 'Extracting medications, lab values and clinical text via AI...' });

      const res = await fetch(`${getApiBase()}/profiles/${profileId}/records`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        let message = 'Upload failed';
        try {
          const err = (await res.json()) as any;
          message = err.error?.message || err.detail?.error?.message || err.detail || message;
        } catch {
          message = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(message);
      }

      onProgress?.({ step: 'checking', message: 'Normalizing clinical values against reference standards...' });

      const jsonResp = (await res.json()) as any;
      const inner = (jsonResp.record && (jsonResp.record.record || jsonResp.record.record_json)) || jsonResp.record || jsonResp;
      
      const normalizedRecord: RecordType = {
        record_id: inner.record_id || jsonResp.record_id || '',
        doc_type: inner.doc_type || 'lab_report',
        doc_date: inner.doc_date || null,
        language: inner.language || 'en',
        patient_name_present: Boolean(inner.patient_name_present),
        medicines: Array.isArray(inner.medicines) ? inner.medicines : [],
        tests: Array.isArray(inner.tests) ? inner.tests : [],
        diagnoses: Array.isArray(inner.diagnoses) ? inner.diagnoses : [],
        summary_en: inner.summary_en || null,
        summary_ta: inner.summary_ta || null,
        needs_review: Array.isArray(inner.needs_review) ? inner.needs_review : [],
        disclaimer: inner.disclaimer || '',
        error: inner.error || null,
      };

      onProgress?.({ step: 'complete', message: 'Medical data extraction complete! Ready for review.' });

      return {
        record_id: jsonResp.record_id || inner.record_id,
        status: jsonResp.status || 'draft',
        record: normalizedRecord,
      };
    } catch (err) {
      throw { error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Upload failed. Please check network or file format.' } } as ApiError;
    }
  },

  async getRecord(id: string): Promise<{ record_id: string; status: 'draft' | 'confirmed'; record: RecordType }> {
    const data = await request<any>(`/records/${id}`);
    const inner = (data && (data.record || data.record_json)) || data || {};
    const normalizedRecord: RecordType = {
      record_id: inner.record_id || data?.record_id || id,
      doc_type: inner.doc_type || data?.doc_type || 'lab_report',
      doc_date: inner.doc_date || data?.doc_date || null,
      language: inner.language || data?.language || 'en',
      patient_name_present: Boolean(inner.patient_name_present),
      medicines: Array.isArray(inner.medicines) ? inner.medicines : (Array.isArray(data?.medicines) ? data.medicines : []),
      tests: Array.isArray(inner.tests) ? inner.tests : (Array.isArray(data?.tests) ? data.tests : []),
      diagnoses: Array.isArray(inner.diagnoses) ? inner.diagnoses : [],
      summary_en: inner.summary_en || null,
      summary_ta: inner.summary_ta || null,
      needs_review: Array.isArray(inner.needs_review) ? inner.needs_review : (Array.isArray(data?.needs_review) ? data.needs_review : []),
      disclaimer: inner.disclaimer || data?.disclaimer || '',
      error: inner.error || null,
    };

    return {
      record_id: data.record_id || id,
      status: data.status || 'draft',
      record: normalizedRecord,
    };
  },

  async getRecordFile(id: string): Promise<Blob> {
    const res = await fetch(`${getApiBase()}/records/${id}/file`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Document file unavailable (HTTP ${res.status})`);
    return res.blob();
  },

  async confirmRecord(id: string, record: RecordType): Promise<{ record_id: string; status: 'confirmed'; record: RecordType }> {
    return request(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ record }),
    });
  },

  async deleteRecord(id: string): Promise<{ deleted: boolean }> {
    return request(`/records/${id}`, {
      method: 'DELETE',
    });
  },

  async getTimeline(profileId: string = 'default'): Promise<TimelineResponse> {
    return request(`/profiles/${profileId}/timeline`);
  },

  async getTrends(profileId: string = 'default', test: string = 'HbA1c'): Promise<TrendsResponse> {
    return request(`/profiles/${profileId}/trends?test=${encodeURIComponent(test)}`);
  },

  async getAlerts(profileId: string = 'default'): Promise<AlertsResponse> {
    return request(`/profiles/${profileId}/alerts`);
  },

  // ── Reminders ──
  async getReminders(profileId: string): Promise<RemindersResponse> {
    return request<RemindersResponse>(`/profiles/${profileId}/reminders`);
  },

  async createReminder(profileId: string, data: Partial<Reminder>): Promise<Reminder> {
    return request<Reminder>(`/profiles/${profileId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateReminder(profileId: string, reminderId: string, data: Partial<Reminder>): Promise<Reminder> {
    return request<Reminder>(`/profiles/${profileId}/reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteReminder(profileId: string, reminderId: string): Promise<{ deleted: boolean }> {
    return request(`/profiles/${profileId}/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  },

  // ── Agentic Actions ──
  async getAgenticActions(profileId: string): Promise<AgenticActionsResponse> {
    return request<AgenticActionsResponse>(`/profiles/${profileId}/agentic-actions`);
  },

  async acceptAgenticAction(profileId: string, actionId: string, confirmedData?: any): Promise<{ status: string; message: string }> {
    return request(`/profiles/${profileId}/agentic-actions/accept`, {
      method: 'POST',
      body: JSON.stringify({ action_id: actionId, confirmed_data: confirmedData }),
    });
  },

  // ── Wellness Recommendations ──
  async getWellness(profileId: string): Promise<WellnessResponse> {
    return request<WellnessResponse>(`/profiles/${profileId}/wellness`);
  },

  // ── Grounded Chat Assistant ──
  async askRecords(
    profileId: string = 'default',
    question: string,
    lang: string = 'en'
  ): Promise<{ answer: string; sources: Array<{ record_id: string; field: string }>; disclaimer: string; lang: string }> {
    return request(`/profiles/${profileId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, lang }),
    });
  },

  // ── Emergency SOS ──
  async getEmergencyProfile(profileId: string): Promise<EmergencyProfileOut> {
    return request<EmergencyProfileOut>(`/sos/emergency-profile/${profileId}`);
  },

  async getSosEvents(profileId: string): Promise<{ profile_id: string; events: SosEvent[] }> {
    return request<{ profile_id: string; events: SosEvent[] }>(`/sos/events/${profileId}`);
  },

  async postSosAlert(alert: SosAlertCreate): Promise<{ event_id: string; status: string; timestamp: string }> {
    return request<{ event_id: string; status: string; timestamp: string }>('/sos/alert', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  },

  // ── ABHA / FHIR ──
  async linkAbha(profileId: string = 'default', abhaId: string): Promise<{ mock: boolean; status: string; abha_id: string }> {
    return request(`/profiles/${profileId}/abha/link`, {
      method: 'POST',
      body: JSON.stringify({ abha_id: abhaId }),
    });
  },

  async importAbha(profileId: string = 'default'): Promise<{ status: string; imported_record_ids: string[] }> {
    return request(`/profiles/${profileId}/abha/import`, {
      method: 'POST',
    });
  },

  async getFhirBundle(profileId: string): Promise<any> {
    return request(`/fhir/profiles/${profileId}/export`);
  },

  async healthCheck(): Promise<{ status: string }> {
    return request('/health');
  },

  // Backwards compatibility stubs for UI toggles
  setUseMock(_val: boolean) {},
  getUseMock(): boolean { return false; },
};

export const getEmergencyProfile = (profileId: string) => api.getEmergencyProfile(profileId);
export const getSosEvents = (profileId: string) => api.getSosEvents(profileId);
export const postSosAlert = (alert: SosAlertCreate) => api.postSosAlert(alert);

export default api;