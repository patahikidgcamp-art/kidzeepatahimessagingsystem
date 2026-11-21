import { authFetch } from '../utils/authClient';

export interface ServerConnectedUser {
  phoneNumber: string;
  pushName: string;
  schoolName: string;
  platform: string;
  batteryLevel: number;
  isCharging: boolean;
  connectedAt: string;
  sessionId: string;
  messagesSentCount: number;
}

export interface ServerBatchState {
  isProcessing: boolean;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentRecipient: string | null;
  lastMessageId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelRequested: boolean;
}

export interface ServerStatusResponse {
  online: boolean;
  status: 'DISCONNECTED' | 'PAIRING' | 'CONNECTED';
  connectedUser: ServerConnectedUser | null;
  qrAvailable: boolean;
  qrGeneratedAt: number;
  batchState: ServerBatchState;
  serverTime: string;
  uptimeSeconds: number;
}

export interface QrLoginResponse {
  success: boolean;
  status: 'DISCONNECTED' | 'PAIRING' | 'CONNECTED';
  qrPayload: string;
  qrDataUrl: string;
  pairingCode: string;
  expiresIn: number;
  error?: string;
}

export interface ServerLogEntry {
  id: string;
  timestamp: string;
  recipientMobile: string;
  recipientName: string;
  studentName?: string;
  studentId?: string;
  messagePreview: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING' | 'SYSTEM';
  messageId: string;
  channel: 'WhatsApp Web Multi-Device';
  serverLatencyMs: number;
}

export interface BatchItemPayload {
  studentId: string;
  studentName: string;
  parentName: string;
  parentMobile: string;
  message: string;
  duesOwed?: number;
}

export const whatsappServerApi = {
  /**
   * Check connection status of the WhatsApp server daemon
   */
  async getStatus(): Promise<ServerStatusResponse> {
    try {
      const res = await authFetch('/api/whatsapp/status', {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        online: false,
        status: 'DISCONNECTED',
        connectedUser: null,
        qrAvailable: false,
        qrGeneratedAt: 0,
        batchState: {
          isProcessing: false,
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          currentRecipient: null,
          lastMessageId: null,
          startedAt: null,
          completedAt: null,
          cancelRequested: false,
        },
        serverTime: new Date().toISOString(),
        uptimeSeconds: 0,
      };
    }
  },

  /**
   * Start or refresh QR Code login session
   */
  async startLoginSession(): Promise<QrLoginResponse> {
    const res = await authFetch('/api/whatsapp/login/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to initiate QR session (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * Generate an 8-character pairing code for linking via school phone number
   */
  async requestPairingCode(phoneNumber: string): Promise<{
    success: boolean;
    pairingCode: string;
    phoneNumber: string;
    instructions: string[];
  }> {
    const res = await authFetch('/api/whatsapp/login/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate pairing code');
    }
    return await res.json();
  },

  /**
   * Confirm QR scan or simulated device pair
   */
  async confirmScanOrLink(params?: {
    phoneNumber?: string;
    pushName?: string;
    schoolName?: string;
  }): Promise<{
    success: boolean;
    status: 'CONNECTED';
    connectedUser: ServerConnectedUser;
  }> {
    const res = await authFetch('/api/whatsapp/login/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete login handshake');
    }
    return await res.json();
  },

  /**
   * Revoke session and logout
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    const res = await authFetch('/api/whatsapp/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error('Failed to logout');
    }
    return await res.json();
  },

  /**
   * Direct message dispatch through server daemon
   */
  async sendMessage(params: {
    recipientMobile: string;
    recipientName: string;
    message: string;
    studentName?: string;
    studentId?: string;
  }): Promise<{
    success: boolean;
    messageId: string;
    status: 'DELIVERED' | 'FAILED';
    error?: string;
  }> {
    const res = await authFetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send WhatsApp message via server');
    }
    return data;
  },

  /**
   * Server-authoritative batch queue transmission
   */
  async sendBatchQueue(
    items: BatchItemPayload[],
    throttleDelayMs: number = 1500
  ): Promise<{
    success: boolean;
    started: boolean;
    totalQueued: number;
    batchState: ServerBatchState;
  }> {
    const res = await authFetch('/api/whatsapp/send-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, throttleDelayMs }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to trigger batch transmission');
    }
    return data;
  },

  /**
   * Poll batch status
   */
  async getBatchStatus(): Promise<{ success: boolean; batchState: ServerBatchState }> {
    const res = await authFetch('/api/whatsapp/batch-status');
    if (!res.ok) {
      throw new Error('Failed to fetch batch queue status');
    }
    return await res.json();
  },

  /**
   * Request batch cancellation
   */
  async cancelBatch(): Promise<void> {
    await authFetch('/api/whatsapp/batch-cancel', { method: 'POST' });
  },

  /**
   * Retrieve server transmission logs
   */
  async getLogs(status?: string, limit: number = 100): Promise<{
    success: boolean;
    totalLogs: number;
    logs: ServerLogEntry[];
  }> {
    const url = new URL('/api/whatsapp/logs', window.location.origin);
    if (status) url.searchParams.set('status', status);
    if (limit) url.searchParams.set('limit', limit.toString());

    const res = await authFetch(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch server logs');
    }
    return await res.json();
  },

  /**
   * Clear all server logs
   */
  async clearLogs(): Promise<void> {
    await authFetch('/api/whatsapp/logs', { method: 'DELETE' });
  },
};
