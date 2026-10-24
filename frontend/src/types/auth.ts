export type PatientProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  hospitalName: string;
  hospitalCode: string;
  uhid: string;
  abhaId: string;
  primaryDoctor: string;
  primaryCondition: string;
  emergencyContact: string;
  lastSync: string;
  isLoggedIn: boolean;
};

export type UserProfile = PatientProfile;
export const DEMO_PATIENTS: PatientProfile[] = [];
export const DEMO_USERS: PatientProfile[] = [];
