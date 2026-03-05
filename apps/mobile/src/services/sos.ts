import { API_URL } from '../constants/api';

async function request<T>(method: string, path: string, token: string, body?: object): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export interface SosContact {
  id:         string;
  status:     'pending' | 'accepted' | 'rejected';
  created_at: string;
  contact: {
    id:         string;
    name:       string;
    phone:      string;
    avatar_url: string | null;
  };
}

export interface IncomingRequest {
  id:         string;
  status:     'pending';
  created_at: string;
  requester: {
    id:         string;
    name:       string;
    phone:      string;
    avatar_url: string | null;
  };
}

export const sosService = {
  getContacts(token: string) {
    return request<{ contacts: SosContact[]; incoming_requests: IncomingRequest[] }>(
      'GET', '/sos/contacts', token,
    );
  },

  addContact(contactId: string, token: string) {
    return request<{ contact: SosContact }>('POST', '/sos/contacts', token, { contact_id: contactId });
  },

  respond(requestId: string, status: 'accepted' | 'rejected', token: string) {
    return request<{ contact: SosContact }>('PATCH', `/sos/contacts/${requestId}`, token, { status });
  },

  remove(contactId: string, token: string) {
    return request<{ ok: boolean }>('DELETE', `/sos/contacts/${contactId}`, token);
  },

  trigger(token: string) {
    return request<{ ok: boolean; event_id: string; notified_count: number }>(
      'POST', '/sos/trigger', token,
    );
  },
};
