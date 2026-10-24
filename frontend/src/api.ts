import {
  AnalyzeResponse,
  ChatResponse,
  HealthResponse,
  LinksResponse,
  SummaryResponse,
} from './types';
import {
  mockChatReply,
  mockLabReportResponse,
  mockLinksResponse,
  mockPrescriptionResponse,
  mockSummaryResponse,
} from './mockData';

export class ApiError extends Error {
  statusCode: number;
  reason?: string;
  isSessionExpired: boolean;

  constructor(message: string, statusCode: number, reason?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.reason = reason;
    this.isSessionExpired = statusCode === 404;
  }
}

// Error normalizer function adhering strictly to contract:
// detail object, detail string, detail array, non-JSON, network failure
async function normalizeError(res: Response): Promise<ApiError> {
  const status = res.status;
  let message = 'An unexpected server error occurred.';
  let reason: string | undefined = undefined;

  try {
    const text = await res.text();
    if (!text) {
      if (status === 404) {
        return new ApiError('Session expired or document not found. Please upload the document again.', 404);
      }
      return new ApiError(`Server returned HTTP ${status}.`, status);
    }

    try {
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        const detail = data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors: [{ msg: string, loc: [...] }]
          message = detail.map((d: { msg?: string }) => d.msg || 'Validation error').join('; ');
        } else if (detail && typeof detail === 'object') {
          message = detail.message || (status === 404 ? 'Session expired.' : 'Request failed.');
          reason = detail.reason;
        } else if (data.message) {
          message = data.message;
        }
      }
    } catch {
      // Non-JSON response (e.g. 502 Bad Gateway HTML)
      message = text.length > 200 ? text.slice(0, 200) + '...' : text;
    }
  } catch {
    message = `HTTP error ${status}`;
  }

  if (status === 404) {
    message = 'Session expired, please upload the document again';
  } else if (status === 413) {
    message = message || 'File too large. Images must be under 25 MB and PDFs under 14 MB.';
  } else if (status === 415) {
    message = message || 'Unsupported file type. Please upload a PDF, JPG, PNG, WEBP, GIF, or HEIC.';
  } else if (status === 429) {
    message = message || 'Free-tier rate limit reached. Please wait a minute and try again.';
  } else if (status === 500) {
    message = message || 'Server configuration error. Ensure GEMINI_API_KEY is configured on the backend.';
  } else if (status === 502 || status === 504) {
    message = message || 'AI service is currently busy or timed out. Please retry in a moment.';
  }

  return new ApiError(message, status, reason);
}

// Check mock mode
let mockEnabled = import.meta.env.VITE_MOCK === '1';

export function isMockMode(): boolean {
  return mockEnabled;
}

export function setMockMode(enabled: boolean): void {
  mockEnabled = enabled;
}

import { isPQCActive, pqcFetch, encryptFileForPQCUpload } from './pqcClient';

export const api = {
  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    if (mockEnabled) {
      return { status: 'ok', api_key_configured: true, last_working_model: 'gemini-3.5-flash (mock)' };
    }
    try {
      const res = await fetch('/health', { signal });
      if (!res.ok) {
        throw await normalizeError(res);
      }
      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Request cancelled.', 0);
      }
      throw new ApiError('Cannot reach the backend server at localhost:8000. Is uvicorn running?', 0);
    }
  },

  async analyze(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
    if (mockEnabled) {
      // Simulated processing delay with progress
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (file.name.toLowerCase().includes('lab') || file.name.toLowerCase().includes('blood')) {
        return mockLabReportResponse;
      }
      return mockPrescriptionResponse;
    }

    try {
      let res: Response;
      if (isPQCActive()) {
        const encryptedDoc = await encryptFileForPQCUpload(file);
        res = await pqcFetch('/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(encryptedDoc),
          signal,
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/analyze', {
          method: 'POST',
          body: formData,
          signal,
        });
      }

      if (!res.ok) {
        throw await normalizeError(res);
      }

      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Analysis cancelled by user.', 0);
      }
      throw new ApiError('Could not reach backend service. Check network connection or backend server.', 0);
    }
  },

  async chat(sessionId: string, message: string, signal?: AbortSignal): Promise<ChatResponse> {
    if (mockEnabled) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return mockChatReply(message);
    }

    try {
      const res = await pqcFetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message }),
        signal,
      });

      if (!res.ok) {
        throw await normalizeError(res);
      }

      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Chat cancelled.', 0);
      }
      throw new ApiError('Failed to send message. Please check your connection.', 0);
    }
  },

  async getLinks(
    sessionId: string,
    index: number,
    kind: 'purchase' | 'images',
    signal?: AbortSignal
  ): Promise<LinksResponse> {
    if (mockEnabled) {
      return mockLinksResponse(index, kind);
    }

    try {
      const res = await pqcFetch('/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, index, kind }),
        signal,
      });

      if (!res.ok) {
        throw await normalizeError(res);
      }

      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Failed to load links.', 0);
    }
  },

  async getSummary(sessionId: string, signal?: AbortSignal): Promise<SummaryResponse> {
    if (mockEnabled) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return mockSummaryResponse;
    }

    try {
      const res = await pqcFetch('/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
        signal,
      });

      if (!res.ok) {
        throw await normalizeError(res);
      }

      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Failed to generate summary.', 0);
    }
  },
};
