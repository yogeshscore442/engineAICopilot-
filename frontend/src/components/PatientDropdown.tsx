import { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import type { Profile } from '../types';

export default function PatientDropdown() {
  const { profiles, activeProfile, setProfileId, addProfile, logout, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New Profile Form
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('father');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProfile = (p: Profile) => {
    setProfileId(p.profile_id);
    setIsOpen(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const contacts = iceName.trim() && icePhone.trim() ? [{ name: iceName.trim(), phone: icePhone.trim(), relation: 'ICE' }] : [];
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
      setShowAddModal(false);
      setName('');
      setAge('');
      setAllergies('');
      setIceName('');
      setIcePhone('');
      setIsOpen(false);
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to add family member');
    } finally {
      setSaving(false);
    }
  };

  const currentInitials = (activeProfile?.name || user?.name || 'P').charAt(0).toUpperCase();

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          title="Click to switch profile or add family member"
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-left shadow-2xs cursor-pointer select-none ${
            isOpen
              ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
              : 'bg-white hover:bg-teal-50/70 border-slate-200 hover:border-teal-300'
          }`}
        >
          {/* Avatar Circle */}
          <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
            {currentInitials}
          </div>

          {/* Profile Name & Viewing Badge */}
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-teal-800 font-extrabold uppercase bg-teal-100 px-1.5 py-0.2 rounded leading-none">
                Viewing:
              </span>
              <span className="font-extrabold text-slate-900 text-xs truncate max-w-[140px] leading-tight">
                {activeProfile?.name || user?.name || 'Active Patient'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold capitalize truncate max-w-[150px] leading-tight mt-0.5">
              {activeProfile?.relation || 'Self'} • {activeProfile?.blood_group || 'Blood: O+'}
            </p>
          </div>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-transform duration-200 flex-shrink-0 ml-0.5 ${
              isOpen ? 'rotate-180 text-teal-700' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50 animate-fadeIn">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900">Family Health Profiles</p>
                <p className="text-[10px] text-slate-500">Account: {user?.email || 'Active Account'}</p>
              </div>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                {profiles.length} Member{profiles.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Profiles List */}
            <div className="py-1 max-h-60 overflow-y-auto space-y-1">
              {profiles.map((p) => {
                const isSelected = p.profile_id === activeProfile?.profile_id;
                return (
                  <button
                    key={p.profile_id}
                    type="button"
                    onClick={() => handleSelectProfile(p)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-teal-50/80 border border-teal-300 text-teal-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {p.relation || 'Member'} {p.age ? `• ${p.age}y` : ''} {p.blood_group ? `• ${p.blood_group}` : ''}
                        </p>
                      </div>
                    </div>
                    {isSelected && <span className="text-teal-600 font-black text-xs">✓ Active</span>}
                  </button>
                );
              })}
            </div>

            {/* Actions: Add Member & Logout */}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <button
                type="button"
                onClick={() => { setShowAddModal(true); setIsOpen(false); }}
                className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>+</span>
                <span>Add Family Member (Parent / Child / Spouse)</span>
              </button>

              <button
                type="button"
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full py-2 px-3 rounded-xl hover:bg-red-50 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>🚪</span>
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Family Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Add Family Member Profile</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500 capitalize"
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="child">Child / Daughter / Son</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other Relative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    placeholder="e.g. 58"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts (or None)"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ICE Contact Name</label>
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={iceName}
                    onChange={(e) => setIceName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ICE Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98401..."
                    value={icePhone}
                    onChange={(e) => setIcePhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                >
                  {saving ? 'Creating…' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
