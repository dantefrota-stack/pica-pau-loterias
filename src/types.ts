export interface Participant {
  id: string;
  name: string;
  paid: boolean;
}

export interface Bolao {
  id: string;
  adminId: string;
  name: string;
  quotaValue: number;
  pixKey: string;
  participants: Participant[];
  tickets: number[][];
  drawnNumbers: number[];
  createdAt: number;
}

export interface Toast {
  message: string;
  type: 'success' | 'error';
}

export type ViewType = 'dashboard' | 'create' | 'bolao';
export type TabType = 'participants' | 'tickets' | 'generate' | 'results';
