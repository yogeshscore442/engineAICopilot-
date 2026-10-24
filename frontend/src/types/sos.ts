export interface SosEvent {
  event_id: string;
  profile_id: string;
  lat: number;
  lon: number;
  accuracy?: number;
  mode: 'ONLINE' | 'OFFLINE_MESH';
  status: 'SENT' | 'FAILED' | 'RELAYED' | 'CANCELLED';
  contacts_notified: number;
  hops?: number;
  created_at: string;
}

export interface SosAlertCreate {
  profile_id: string;
  lat: number;
  lon: number;
  accuracy?: number;
  mode?: string;
  status?: string;
  contacts_notified?: number;
  hops?: number;
}

export interface IceContactInfo {
  name: string;
  phone: string;
  relation: string;
}

export interface EmergencyProfileOut {
  profile_id: string;
  name: string;
  blood_group?: string;
  conditions: string[];
  medications: string[];
  ice_contacts: IceContactInfo[];
  abha_id?: string;
  disclaimer?: string;
}
