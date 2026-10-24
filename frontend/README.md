# Healthcare Copilot - Mobile-First Frontend

A patient-facing AI healthcare copilot built with **React + Vite + TypeScript + Tailwind CSS** on top of the FastAPI backend.

---

## Features

- **Document Analysis (`/analyze`)**: Upload prescriptions (printed/handwritten) or lab reports (PDF, JPG, PNG, WEBP, GIF, HEIC). Client-side size & type validation, animated progress states with rotating messages, and cancel capability via `AbortController`.
- **Review Step**:
  - Patient & Consultation cards.
  - Visual Dosing Schedule table & mobile timeline (Morning, Afternoon, Evening, Night slots, food relation, duration, end date, approx quantity).
  - Diagnostic Lab table with color-coded flag pills (normal, high, low, abnormal) and reference ranges.
  - Medicines with low-confidence OCR highlight & warning.
  - Per-medicine actions: **Details**, **Buy**, and **Images**.
- **Healthcare Copilot Chat (`/chat`)**:
  - Interactive conversational assistant with auto-scroll, typing indicator, 2000-char counter, and quick-reply chips.
  - Safe markdown rendering (escapes HTML first, **bold**, bullets, linebreaks without raw innerHTML).
  - Voice readout (**Listen**) using browser SpeechSynthesis.
  - Emergency red callout box for acute symptoms.
  - Session expiration (404) friendly recovery flow.
- **Card Rendering (`/links`)**:
  - **Purchase Cards**: Medicine, strength, form/dosage/frequency/duration. If not in prescription or uncertain, prominent warnings. **Mandatory confirmation checkbox** required before store buttons become active. Links open safely in new tabs (`rel="noopener noreferrer"`).
  - **Image Cards**: Verified packaging reference links with manufacturer appearance disclaimer.
- **Summary & Reminders (`/summary`)**:
  - Full consultation summary with Copy, Print (print stylesheet), and Download `.txt` buttons.
  - **Add Reminders (`.ics`)**: Generates and downloads a standard iCalendar file with daily recurring events for each prescribed dosage slot.
- **Mock Mode (`VITE_MOCK=1`)**:
  - Toggleable instantly from the header or via environment variables to demo both Prescriptions and Lab Reports without needing an active backend.
- **Security & Accessibility**:
  - Zero browser persistence: No medical data is stored in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
  - Mobile-first responsive design (375px+), dark & light mode support, high-contrast AA compliant, keyboard accessible.

---

## Running Locally

### 1. Backend (Terminal 1)
Make sure your Gemini API key is configured:
```bash
# In the project root directory
uvicorn main:app --reload --port 8000
```
*(or `python -m uvicorn app_free:app --port 8000 --reload`)*

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Open your browser at **http://localhost:5173**.

Vite dev server automatically proxies `/analyze`, `/chat`, `/links`, `/summary`, and `/health` to `http://localhost:8000`.

---

## Offline / Demo Mock Mode

You can run the frontend completely standalone:
- Click the **Mock: ON** button in the top navigation bar.
- Or start with `VITE_MOCK=1 npm run dev`.
- Sample Prescription and Lab Report buttons appear on the upload screen for instant testing.
