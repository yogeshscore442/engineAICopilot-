import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { api } from '../api';
import type { Profile } from '../types';

export default function Family() {
  const { profiles, activeProfile, setProfileId, addProfile, refreshProfiles, user } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('father');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFamilyMode = profiles.length > 1;
  const [memberStats, setMemberStats] = useState<Record<string, { nextMed: string; riskFlag: string; overdueTest: string }>>({});

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      const stats: Record<string, { nextMed: string; riskFlag: string; overdueTest: string }> = {};
      for (const p of profiles) {
        try {
          const [rems, alerts] = await Promise.allSettled([
            api.getReminders(p.profile_id),
            api.getAlerts(p.profile_id),
          ]);
          let nextMed = 'No active meds';
          if (rems.status === 'fulfilled' && rems.value.reminders?.length) {
            const activeR = rems.value.reminders.find(r => r.is_active && !r.is_completed) || rems.value.reminders[0];
            nextMed = `${activeR.medicine_name || activeR.title} (${activeR.timing || activeR.time_of_day || 'Daily'})`;
          }
          let riskFlag = 'All values normal';
          let overdueTest = 'Checkups up to date';
          if (alerts.status === 'fulfilled' && alerts.value.alerts?.length) {
            const highAlert = alerts.value.alerts[0];
            riskFlag = highAlert.message || 'Duplicate medicine alert';
            overdueTest = 'Review recommended';
          }
          stats[p.profile_id] = { nextMed, riskFlag, overdueTest };
        } catch {
          stats[p.profile_id] = { nextMed: 'No active meds', riskFlag: 'All values normal', overdueTest: 'Up to date' };
        }
      }
      if (active) setMemberStats(stats);
    };
    if (profiles.length) loadStats();
    return () => { active = false; };
  }, [profiles]);

  const getRoleLabel = (rel: string = '') => {
    const r = rel.toLowerCase();
    if (r === 'self') return { role: 'Account Owner', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    if (r === 'spouse') return { role: 'Adult Member', color: 'bg-blue-50 text-blue-800 border-blue-300' };
    if (['father', 'mother'].includes(r)) return { role: 'Dependent (Elderly)', color: 'bg-amber-50 text-amber-800 border-amber-300' };
    if (['son', 'daughter', 'child'].includes(r)) return { role: 'Dependent (Child)', color: 'bg-purple-50 text-purple-800 border-purple-300' };
    return { role: 'Adult Member', color: 'bg-slate-50 text-slate-700 border-slate-300' };
  };

  const handleOpenAdd = () => {
    setName('');
    setRelation('father');
    setAge('');
    setGender('Male');
    setBloodGroup('O+');
    setAllergies('');
    setIceName('');
    setIcePhone('');
    setError(null);
    setEditingProfile(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Profile) => {
    setEditingProfile(p);
    setName(p.name);
    setRelation(p.relation || 'other');
    setAge(p.age ? String(p.age) : '');
    setGender(p.gender || 'Male');
    setBloodGroup(p.blood_group || 'O+');
    setAllergies(p.allergies || '');
    const firstIce = p.ice_contacts?.[0];
    setIceName(firstIce?.name || '');
    setIcePhone(firstIce?.phone || '');
    setError(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const contacts = iceName.trim() && icePhone.trim()
      ? [{ name: iceName.trim(), phone: icePhone.trim(), relation: 'Emergency Contact' }]
      : [];

    try {
      if (editingProfile) {
        await api.updateProfile(editingProfile.profile_id, {
          name: name.trim(),
          relation,
          age: age ? parseInt(age, 10) : undefined,
          gender,
          blood_group: bloodGroup,
          allergies: allergies.trim() || undefined,
          ice_contacts: contacts,
        });
      } else {
        const created = await addProfile({
          name: name.trim(),
          relation,
          age: age ? parseInt(age, 10) : undefined,
          gender,
          blood_group: bloodGroup,
          allergies: allergies.trim() || undefined,
          ice_contacts: contacts,
        });
        setProfileId(created.profile_id);
      }
      await refreshProfiles();
      setShowAddModal(false);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileIdToDelete: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the only profile. A family account must have at least one profile.');
      return;
    }
    if (!confirm('Are you sure you want to delete this family profile and its records?')) return;

    try {
      await api.deleteProfile(profileIdToDelete);
      await refreshProfiles();
      if (activeProfile?.profile_id === profileIdToDelete) {
        const remaining = profiles.filter((p) => p.profile_id !== profileIdToDelete);
        if (remaining.length > 0) {
          setProfileId(remaining[0].profile_id);
        }
      }
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to delete profile');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {isFamilyMode ? 'Family Health Vault (Multi-Member)' : 'Individual Mode (Single Member)'}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              Account: {user?.email}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Family Health Vault & Member Profiles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your entire family health records under one secure account. Each member has their own isolated records, prescriptions, and insights.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
        >
          <span>+</span>
          <span>Add Family Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => {
          const isActive = p.profile_id === activeProfile?.profile_id;
          const initial = (p.name || 'P').charAt(0).toUpperCase();
          const firstIce = p.ice_contacts?.[0];
          const roleInfo = getRoleLabel(p.relation);
          const st = memberStats[p.profile_id] || { nextMed: 'No active meds', riskFlag: 'All values normal', overdueTest: 'Up to date' };

          return (
            <div
              key={p.profile_id}
              className={'rounded-2xl p-5 border transition-all duration-200 relative bg-white shadow-2xs ' +
                (isActive
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300')}
            >
              {isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500 text-white font-extrabold text-[10px] shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>Viewing Active</span>
                </div>
              )}

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-800 text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-slate-900 text-base truncate">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-extrabold capitalize text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      {p.relation || 'Self'}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${roleInfo.color}`}>
                      {roleInfo.role}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {p.age ? (p.age + ' yrs') : 'Age N/A'} • {p.gender || 'Gender N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Blood Group</span>
                  <span className="font-extrabold text-rose-700">{p.blood_group || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Allergies</span>
                  <span className="font-semibold text-slate-700 truncate block">{p.allergies || 'None reported'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Next Medicine</span>
                  <span className="font-bold text-slate-800 truncate block text-[11px]">{st.nextMed}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Latest Risk Flag</span>
                  <span className={`font-bold truncate block text-[11px] ${st.riskFlag.includes('Alert') || st.riskFlag.includes('HIGH') ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {st.riskFlag}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Emergency ICE</span>
                    <span className="font-semibold text-slate-800">
                      {firstIce ? `${firstIce.name} (${firstIce.phone})` : 'National 112'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Checkup Status</span>
                    <span className="font-bold text-slate-700">{st.overdueTest}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                {isActive ? (
                  <button
                    disabled
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-50 text-teal-800 font-extrabold text-xs text-center border border-teal-200 cursor-default"
                  >
                    Active Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setProfileId(p.profile_id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs text-center transition-all shadow-xs cursor-pointer"
                  >
                    {'Switch to ' + p.name.split(' ')[0]}
                  </button>
                )}

                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="Edit Profile"
                >
                  Edit
                </button>

                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDelete(p.profile_id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer border border-rose-200"
                    title="Delete Profile"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingProfile ? 'Edit Family Member Profile' : 'Add New Family Member'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm cursor-pointer"
              >
                X
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-slate-600">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">Relationship *</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="self">Self (Primary)</option>
                    <option value="spouse">Spouse</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="other">Other Dependent</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">Age (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 52"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600">Known Drug Allergies (Optional)</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={iceName}
                    onChange={(e) => setIceName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh / Spouse"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">Emergency Phone (ICE)</label>
                  <input
                    type="tel"
                    value={icePhone}
                    onChange={(e) => setIcePhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingProfile ? 'Update Profile' : 'Save to Family Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
