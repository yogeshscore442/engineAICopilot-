import { createContext, useContext } from 'react';
import { useI18n, type Language } from './i18n';
import type { Profile, UserAccount, Reminder } from './types/index';

export type AppContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: ReturnType<typeof useI18n>['t'];
  user: UserAccount | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  profileId: string;
  setProfileId: (id: string) => void;
  refreshProfiles: () => Promise<void>;
  addProfile: (data: {
    name: string;
    relation: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    allergies?: string;
    ice_contacts?: Array<{ name: string; phone: string; relation: string }>;
  }) => Promise<Profile>;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  reminders: Reminder[];
  refreshReminders: () => Promise<void>;
  useMock: boolean;
  setUseMock: (value: boolean) => void;
  openLoginModal: () => void;
  openNodeModal: () => void;
  openEmergencyModal: () => void;
};

export const AppContext = createContext<AppContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
  user: null,
  profiles: [],
  activeProfile: null,
  profileId: '',
  setProfileId: () => {},
  refreshProfiles: async () => {},
  addProfile: async () => ({} as Profile),
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  reminders: [],
  refreshReminders: async () => {},
  useMock: false,
  setUseMock: () => {},
  openLoginModal: () => {},
  openNodeModal: () => {},
  openEmergencyModal: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
