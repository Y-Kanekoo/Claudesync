import { create } from 'zustand';

// 接続状態
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ConnectionState {
  // 接続状態
  status: ConnectionStatus;
  serverUrl: string | null;
  token: string | null;
  lastSeq: number;
  error: string | null;

  // アクション
  setStatus: (status: ConnectionStatus) => void;
  setServerUrl: (url: string | null) => void;
  setToken: (token: string | null) => void;
  setLastSeq: (seq: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  serverUrl: null,
  token: null,
  lastSeq: 0,
  error: null,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setToken: (token) => set({ token }),
  setLastSeq: (lastSeq) => set({ lastSeq }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
