import { AnalyzeResponse, ChatResponse, LinksResponse, SummaryResponse } from './types';

export const mockPrescriptionResponse: AnalyzeResponse = {
  valid: true,
  document_type: 'prescription',
  reason: 'Valid medical prescription from Dr. R. Selvan, MBBS, MD.',
  image_quality: 'good',
  needs_human_review: true,
  review_notes: [
    'Handwriting for Pantoprazole frequency is slightly faint; verified as once daily before breakfast (OD).',
    'Confirm Azithromycin course with your pharmacist if you experience gastric upset.'
  ],
  patient: {
    name: 'Kavitha Ramaswamy',
    age: '38 Y',
    gender: 'Female',
    id: 'UHID-2026-98124'
  },
  prescription: {
    doctor_name: 'Dr. R. Selvan, MBBS, MD (Gen Med)',
    registration_no: 'TN-MC-78412',
    clinic_or_hospital: 'Apollo Medical Centre, T. Nagar, Chennai',
    date: '2026-10-24',
    diagnosis: 'Acute Bacterial Sinusitis with Pharyngitis & Mild Gastritis',
    advice: 'Drink warm fluids, steam inhalation twice daily, light diet with low oil.',
    follow_up: 'Review in 5 days if fever or symptoms persist.',
    medicines: [
      {
        name: 'Augmentin 625 Duo',
        strength: '625 mg',
        form: 'Tablet',
        dosage: '1 tablet',
        frequency: '1-0-1 (BD)',
        duration: '5 days',
        instructions: 'After food with a full glass of water',
        confidence: 'high',
        uncertain_text: null
      },
      {
        name: 'Pan 40',
        strength: '40 mg',
        form: 'Tablet',
        dosage: '1 tablet',
        frequency: '1-0-0 (OD)',
        duration: '5 days',
        instructions: 'Before breakfast in the morning on empty stomach',
        confidence: 'high',
        uncertain_text: null
      },
      {
        name: 'Dolo 650',
        strength: '650 mg',
        form: 'Tablet',
        dosage: '1 tablet',
        frequency: 'SOS (As needed)',
        duration: '3 days',
        instructions: 'Take only if fever > 100°F or severe body ache (max 3/day)',
        confidence: 'high',
        uncertain_text: null
      },
      {
        name: 'Levocet-M',
        strength: '5mg / 10mg',
        form: 'Tablet',
        dosage: '1 tablet',
        frequency: '0-0-1 (HS)',
        duration: '5 days',
        instructions: 'At bedtime, may cause slight drowsiness',
        confidence: 'low',
        uncertain_text: 'Levoc...M'
      }
    ]
  },
  full_text: `Dr. R. Selvan, MBBS, MD (Gen Med) - Reg No: TN-MC-78412
Apollo Medical Centre, T. Nagar, Chennai - Ph: 044-24340000
Date: 24/10/2026
Patient: Kavitha Ramaswamy, 38/F, UHID: UHID-2026-98124
Diagnosis: Acute Bacterial Sinusitis with Pharyngitis & Mild Gastritis

Rx:
1. Tab. Augmentin 625 Duo (Amox + Clav 625mg) - 1-0-1 x 5 days (After food)
2. Tab. Pan 40 (Pantoprazole 40mg) - 1-0-0 x 5 days (Before breakfast)
3. Tab. Dolo 650 (Paracetamol 650mg) - 1 tab SOS for fever/pain (After food)
4. Tab. Levocet-M (Levocetirizine + Montelukast) - 0-0-1 x 5 days (At bedtime)

Advice: Steam inhalation BD. Warm water gargle. Plenty of fluids.
Follow-up: After 5 days.
Signature: [Dr. R. Selvan]`,
  schedule: [
    {
      index: 0,
      name: 'Augmentin 625 Duo',
      strength: '625 mg',
      form: 'Tablet',
      dosage: '1 tablet',
      frequency_raw: '1-0-1 (BD)',
      duration_raw: '5 days',
      slots: { morning: '1', night: '1' },
      as_needed: false,
      parsed: true,
      assumed_times: false,
      qty_assumed: false,
      food: 'After food',
      per_day: 2,
      duration_days: 5,
      end_date: '2026-10-29',
      total_units: '10',
      unit: 'tablets',
      needs_check: false
    },
    {
      index: 1,
      name: 'Pan 40',
      strength: '40 mg',
      form: 'Tablet',
      dosage: '1 tablet',
      frequency_raw: '1-0-0 (OD)',
      duration_raw: '5 days',
      slots: { morning: '1' },
      as_needed: false,
      parsed: true,
      assumed_times: true,
      qty_assumed: false,
      food: 'Before food',
      per_day: 1,
      duration_days: 5,
      end_date: '2026-10-29',
      total_units: '5',
      unit: 'tablets',
      needs_check: false
    },
    {
      index: 2,
      name: 'Dolo 650',
      strength: '650 mg',
      form: 'Tablet',
      dosage: '1 tablet',
      frequency_raw: 'SOS (As needed)',
      duration_raw: '3 days',
      slots: {},
      as_needed: true,
      parsed: true,
      assumed_times: false,
      qty_assumed: true,
      food: 'After food',
      per_day: 1,
      duration_days: 3,
      end_date: '2026-10-27',
      total_units: '3',
      unit: 'tablets',
      needs_check: false
    },
    {
      index: 3,
      name: 'Levocet-M',
      strength: '5mg / 10mg',
      form: 'Tablet',
      dosage: '1 tablet',
      frequency_raw: '0-0-1 (HS)',
      duration_raw: '5 days',
      slots: { night: '1' },
      as_needed: false,
      parsed: true,
      assumed_times: false,
      qty_assumed: false,
      food: 'After food',
      per_day: 1,
      duration_days: 5,
      end_date: '2026-10-29',
      total_units: '5',
      unit: 'tablets',
      needs_check: true
    }
  ],
  session_id: 'mock-session-rx-2026'
};

export const mockLabReportResponse: AnalyzeResponse = {
  valid: true,
  document_type: 'lab_report',
  reason: 'Valid diagnostic blood panel from Metropolis Healthcare.',
  image_quality: 'good',
  needs_human_review: false,
  review_notes: [
    'Fasting glucose and HbA1c are elevated above reference range; discuss with clinician.'
  ],
  patient: {
    name: 'Suresh Narayanan',
    age: '54 Y',
    gender: 'Male',
    id: 'LAB-992147'
  },
  lab_report: {
    lab_name: 'Metropolis Healthcare Diagnostic Laboratory, Chennai',
    collection_date: '2026-10-23 07:30 AM',
    report_date: '2026-10-23 05:45 PM',
    referred_by: 'Dr. M. Sundaram, MD',
    remarks: 'Sample non-hemolyzed. Fasting verified (>8 hours).',
    tests: [
      {
        name: 'Fasting Plasma Glucose (FBS)',
        value: '168.0',
        unit: 'mg/dL',
        reference_range: '70.0 - 99.0',
        flag: 'high',
        confidence: 'high'
      },
      {
        name: 'Glycated Hemoglobin (HbA1c)',
        value: '8.2',
        unit: '%',
        reference_range: '4.0 - 5.6',
        flag: 'high',
        confidence: 'high'
      },
      {
        name: 'Serum Creatinine',
        value: '0.95',
        unit: 'mg/dL',
        reference_range: '0.70 - 1.30',
        flag: 'normal',
        confidence: 'high'
      },
      {
        name: 'Total Cholesterol',
        value: '228.0',
        unit: 'mg/dL',
        reference_range: '125.0 - 200.0',
        flag: 'high',
        confidence: 'high'
      },
      {
        name: 'Triglycerides',
        value: '210.0',
        unit: 'mg/dL',
        reference_range: '< 150.0',
        flag: 'high',
        confidence: 'high'
      },
      {
        name: 'HDL Cholesterol',
        value: '38.0',
        unit: 'mg/dL',
        reference_range: '> 40.0',
        flag: 'low',
        confidence: 'high'
      },
      {
        name: 'Hemoglobin (Hb)',
        value: '14.2',
        unit: 'g/dL',
        reference_range: '13.0 - 17.0',
        flag: 'normal',
        confidence: 'high'
      }
    ]
  },
  full_text: `METROPOLIS HEALTHCARE LTD - ISO 15189 CERTIFIED
Patient: Suresh Narayanan | Age: 54 Y / M | Ref: Dr. M. Sundaram, MD
Sample Collected: 23-Oct-2026 07:30 | Reported: 23-Oct-2026 17:45

BIOCHEMISTRY REPORT:
Fasting Plasma Glucose (FBS): 168.0 mg/dL [Ref: 70 - 99] - HIGH
HbA1c: 8.2 % [Ref: 4.0 - 5.6] - HIGH
Estimated Average Glucose (eAG): 189 mg/dL
Serum Creatinine: 0.95 mg/dL [Ref: 0.70 - 1.30] - NORMAL
Total Cholesterol: 228.0 mg/dL [Ref: < 200] - HIGH
Triglycerides: 210.0 mg/dL [Ref: < 150] - HIGH
HDL Cholesterol: 38.0 mg/dL [Ref: > 40] - LOW
LDL Cholesterol (Calc): 148.0 mg/dL [Ref: < 100] - HIGH

Verified by: Dr. A. K. Varma, MD (Pathology)`,
  schedule: [],
  session_id: 'mock-session-lab-2026'
};

export const mockChatReply = (message: string): ChatResponse => {
  const lower = message.toLowerCase();
  
  if (lower.includes('chest pain') || lower.includes('breathing') || lower.includes('emergency')) {
    return {
      reply: `**EMERGENCY: Call 112 or 108 immediately or go to the nearest emergency room.**

Do not wait or take medications on your own. Chest pain or difficulty breathing are serious symptoms that require urgent medical evaluation.`,
      cards: []
    };
  }

  if (lower.includes('augmentin') || lower.includes('when') || lower.includes('epo edukanum')) {
    return {
      reply: `Here is how to take **Augmentin 625 Duo**:

- **Dose**: Take **1 tablet** twice daily (**Morning** and **Night**).
- **Food relation**: Take **After food** with a full glass of water to avoid stomach upset.
- **Duration**: Complete all **5 days** of the prescribed course even if you feel better earlier.
- **Missed dose**: If you miss a dose, take it as soon as you remember, unless it is almost time for your next dose. Never take two doses together.

*General information only. Always follow your doctor's exact advice.*`,
      cards: [
        {
          type: 'purchase',
          medicine: 'Augmentin 625 Duo',
          strength: '625 mg',
          in_prescription: true,
          form: 'Tablet',
          dosage: '1 tablet',
          frequency: '1-0-1 (BD)',
          duration: '5 days',
          links: [
            { store: 'Tata 1mg', url: 'https://www.1mg.com/search/all?name=Augmentin+625+Duo' },
            { store: 'Apollo Pharmacy', url: 'https://www.apollopharmacy.in/search-medicines/Augmentin+625+Duo' },
            { store: 'Netmeds', url: 'https://www.netmeds.com/catalogsearch/result/Augmentin+625+Duo/all' }
          ]
        }
      ]
    };
  }

  if (lower.includes('sugar') || lower.includes('glucose') || lower.includes('abnormal')) {
    return {
      reply: `Looking at your report:

- **Fasting Plasma Glucose (168 mg/dL)** is flagged **HIGH** (normal reference is 70 to 99 mg/dL).
- **HbA1c (8.2%)** is also **HIGH** (normal is under 5.7%). HbA1c reflects your average blood sugar over the past 2 to 3 months.
- **Triglycerides (210 mg/dL)** and **Total Cholesterol (228 mg/dL)** are elevated above reference targets.

**What to ask your doctor**:
- Ask whether lifestyle changes (diet, walking) or medication adjustment is recommended.
- Inquire about a repeat lipid and sugar profile timeline.

*Information only, not medical diagnosis. Please consult your physician for clinical interpretation.*`,
      cards: []
    };
  }

  return {
    reply: `I have reviewed your medical document:

- **Medicines**: Your prescription has **4 medicines** prescribed for **5 days**.
- **Important**: Take **Pan 40** in the morning *before breakfast*, and **Augmentin 625** *after breakfast and dinner*.
- **Note**: **Levocet-M** has low handwriting confidence on the strip name; please verify the exact strip with your pharmacist before consumption.

Would you like details on a specific medicine or need help checking when to take your next dose?`,
    cards: []
  };
};

export const mockSummaryResponse: SummaryResponse = {
  summary: `**1. Clinical Overview**
- **Patient**: Kavitha Ramaswamy (38 Y, Female, UHID: UHID-2026-98124)
- **Consultant**: Dr. R. Selvan, MBBS, MD (Gen Med), Apollo Medical Centre
- **Diagnosis**: Acute Bacterial Sinusitis with Pharyngitis & Mild Gastritis
- **Prescription Date**: 24-Oct-2026

**2. Prescribed Medications & Schedule**
- **Pan 40 (Pantoprazole 40mg)**: 1 tab once daily in the morning BEFORE breakfast (Empty stomach) for 5 days. Approx to buy: ~5 tablets.
- **Augmentin 625 Duo (625mg)**: 1 tab twice daily (Morning & Night) AFTER meals with water for 5 days. Total to buy: ~10 tablets.
- **Levocet-M (5/10mg)**: 1 tab at bedtime (Night) for 5 days. Note: handwriting was unclear on prescription, confirm exact strip name with pharmacist. Total: ~5 tablets.
- **Dolo 650 (650mg)**: 1 tab SOS (As needed) for fever > 100°F or body pain. Max 3 times/day after food. Approx to buy: ~3 to 5 tablets.

**3. General Care & Advice**
- Drink plenty of warm water and clear soups.
- Steam inhalation twice daily for nasal congestion.
- Avoid cold beverages and oily/spicy foods while taking antibiotics.

**4. Follow-Up & Red Flags**
- Follow up with Dr. R. Selvan in 5 days.
- Seek immediate medical care if you develop rash, facial swelling, breathing difficulty, or persistent vomiting.`
};

export const mockLinksResponse = (index: number, kind: 'purchase' | 'images'): LinksResponse => {
  const med = mockPrescriptionResponse.schedule.find(s => s.index === index) || mockPrescriptionResponse.schedule[0];
  const q = encodeURIComponent(`${med.name} ${med.strength || ''}`.trim());

  if (kind === 'purchase') {
    return {
      cards: [
        {
          type: 'purchase',
          medicine: med.name,
          strength: med.strength,
          in_prescription: true,
          form: med.form,
          dosage: med.dosage,
          frequency: med.frequency_raw,
          duration: med.duration_raw,
          uncertain: med.needs_check,
          uncertain_text: med.needs_check ? 'Low OCR confidence' : undefined,
          links: [
            { store: 'Tata 1mg', url: `https://www.1mg.com/search/all?name=${q}` },
            { store: 'Apollo Pharmacy', url: `https://www.apollopharmacy.in/search-medicines/${q}` },
            { store: 'Netmeds', url: `https://www.netmeds.com/catalogsearch/result/${q}/all` }
          ]
        }
      ]
    };
  }

  return {
    cards: [
      {
        type: 'images',
        medicine: med.name,
        strength: med.strength,
        in_prescription: true,
        links: [
          { store: 'Google Image Reference', url: `https://www.google.com/search?tbm=isch&q=${q}+tablet+strip+packaging` }
        ]
      }
    ]
  };
};
