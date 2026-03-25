import { authorizedRequest } from './http';

export interface SosContact {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
  };
}

export interface IncomingRequest {
  id: string;
  status: 'pending';
  created_at: string;
  requester: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
  };
}

export const sosService = {
  getContacts(_token: string) {
    return authorizedRequest<{ contacts: SosContact[]; incoming_requests: IncomingRequest[] }>(
      'GET',
      '/sos/contacts',
    );
  },

  addContact(contactId: string, _token: string) {
    return authorizedRequest<{ contact: SosContact }>(
      'POST',
      '/sos/contacts',
      { contact_id: contactId },
    );
  },

  respond(requestId: string, status: 'accepted' | 'rejected', _token: string) {
    return authorizedRequest<{ contact: SosContact }>(
      'PATCH',
      `/sos/contacts/${requestId}`,
      { status },
    );
  },

  remove(contactId: string, _token: string) {
    return authorizedRequest<{ ok: boolean }>(
      'DELETE',
      `/sos/contacts/${contactId}`,
    );
  },

  trigger(_token: string) {
    return authorizedRequest<{ ok: boolean; event_id: string; notified_count: number }>(
      'POST',
      '/sos/trigger',
    );
  },
};
