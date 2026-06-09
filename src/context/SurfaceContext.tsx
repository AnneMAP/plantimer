import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuState =
  | 'HOME'
  | 'SOURCE_SELECT'
  | 'MAIN'
  | 'SRC'
  | 'SRC_TYPE'
  | 'RIN_SELECT'
  | 'WAIT_UI'
  | 'GAIN'
  | 'EQ'
  | 'COMP'
  | 'BUS';

export interface ChannelState {
  channelId: string;
  label: string;
  source: string;
  sourceType: string;
  onAir: boolean;
  pfl: boolean;
  talkback: boolean;
  fader: number;       // 0.0–1.0
  gain: number;        // dB
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  compThreshold: number;
  compRatio: number;
  buses: string[];
  meter: number;       // 0.0–1.0 amplitude
  menuState: MenuState;
  menuIndex: number;
}

export interface AppState {
  wsConnected: boolean;
  studioId: string;
  wsUrl: string;
  channels: Record<string, ChannelState>;
  sources: string[];
  rinTracks: string[];
  channelOrder: string[];
}

type Action =
  | { type: 'WS_CONNECTED' }
  | { type: 'WS_DISCONNECTED' }
  | { type: 'SET_STUDIO'; studioId: string; wsUrl: string }
  | { type: 'CHANNEL_STATE'; payload: Partial<ChannelState> & { channelId: string } }
  | { type: 'SOURCES_LIST'; sources: string[] }
  | { type: 'RIN_LIST'; tracks: string[] }
  | { type: 'METER_UPDATE'; channelId: string; level: number }
  | { type: 'SET_MENU'; channelId: string; menuState: MenuState; menuIndex?: number }
  | { type: 'SET_MENU_INDEX'; channelId: string; menuIndex: number };

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'];
const BUS_NAMES = ['PGM1','PGM2','REC','AUX','MON'];
const MAIN_MENU_ITEMS = ['SRC','GAIN','EQ','COMP','BUS','STUDIO','BACK'];

function makeChannel(id: string): ChannelState {
  return {
    channelId: id,
    label: id.toUpperCase(),
    source: '---',
    sourceType: 'OTHER',
    onAir: false,
    pfl: false,
    talkback: false,
    fader: 0,
    gain: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    compThreshold: -20,
    compRatio: 4,
    buses: [],
    meter: 0,
    menuState: 'HOME',
    menuIndex: 0,
  };
}

const initialState: AppState = {
  wsConnected: false,
  studioId: '',
  wsUrl: '',
  channels: Object.fromEntries(DEFAULT_CHANNELS.map(id => [id, makeChannel(id)])),
  sources: [],
  rinTracks: [],
  channelOrder: DEFAULT_CHANNELS,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'WS_CONNECTED':
      return { ...state, wsConnected: true };
    case 'WS_DISCONNECTED':
      return { ...state, wsConnected: false };
    case 'SET_STUDIO':
      return { ...state, studioId: action.studioId, wsUrl: action.wsUrl };
    case 'CHANNEL_STATE': {
      const id = action.payload.channelId;
      const existing = state.channels[id] ?? makeChannel(id);
      const updated = { ...existing, ...action.payload };
      const order = state.channelOrder.includes(id)
        ? state.channelOrder
        : [...state.channelOrder, id];
      return {
        ...state,
        channels: { ...state.channels, [id]: updated },
        channelOrder: order,
      };
    }
    case 'SOURCES_LIST':
      return { ...state, sources: action.sources };
    case 'RIN_LIST':
      return { ...state, rinTracks: action.tracks };
    case 'METER_UPDATE': {
      const ch = state.channels[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        channels: { ...state.channels, [action.channelId]: { ...ch, meter: action.level } },
      };
    }
    case 'SET_MENU': {
      const ch = state.channels[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        channels: {
          ...state.channels,
          [action.channelId]: {
            ...ch,
            menuState: action.menuState,
            menuIndex: action.menuIndex ?? 0,
          },
        },
      };
    }
    case 'SET_MENU_INDEX': {
      const ch = state.channels[action.channelId];
      if (!ch) return state;
      return {
        ...state,
        channels: {
          ...state.channels,
          [action.channelId]: { ...ch, menuIndex: action.menuIndex },
        },
      };
    }
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SurfaceCtx {
  state: AppState;
  send: (msg: object) => void;
  connect: (wsUrl: string, studioId: string) => void;
  disconnect: () => void;
  // channel actions
  sendOnPress: (chId: string) => void;
  sendPflPress: (chId: string) => void;
  sendTalkbackOn: (chId: string) => void;
  sendTalkbackOff: (chId: string) => void;
  sendFader: (chId: string, value: number) => void;
  sendSetSource: (chId: string, source: string) => void;
  sendBusToggle: (chId: string, bus: string) => void;
  sendSetGain: (chId: string, value: number) => void;
  sendSetEq: (chId: string, band: 'low'|'mid'|'high', value: number) => void;
  sendSetComp: (chId: string, param: 'threshold'|'ratio', value: number) => void;
  sendEncoderRotate: (chId: string, delta: number) => void;
  handleMenuPress: (chId: string) => void;
  handleMenuRotate: (chId: string, delta: number) => void;
  busNames: string[];
  mainMenuItems: string[];
}

const SurfaceContext = createContext<SurfaceCtx | null>(null);

export function useSurface() {
  const ctx = useContext(SurfaceContext);
  if (!ctx) throw new Error('useSurface must be used inside SurfaceProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SurfaceProvider({ children }: { children?: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const ws = useRef<WebSocket | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const send = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleMessage = useCallback((raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    const event = msg.event as string;

    if (event === 'channel_state') {
      dispatch({
        type: 'CHANNEL_STATE',
        payload: {
          channelId: msg.channel,
          label:     msg.label   ?? msg.channel,
          source:    msg.source  ?? '---',
          sourceType:msg.source_type ?? 'OTHER',
          onAir:     msg.onair   ?? false,
          pfl:       msg.pfl     ?? false,
          fader:     msg.fader   ?? 0,
          gain:      msg.gain    ?? 0,
          eqLow:     msg.eq_low  ?? 0,
          eqMid:     msg.eq_mid  ?? 0,
          eqHigh:    msg.eq_high ?? 0,
          compThreshold: msg.comp_threshold ?? -20,
          compRatio:     msg.comp_ratio     ?? 4,
          buses:     msg.buses   ?? [],
          meter:     msg.meter   ?? 0,
        },
      });
    } else if (event === 'full_state') {
      const channels: any[] = msg.channels ?? [];
      channels.forEach(ch => {
        dispatch({
          type: 'CHANNEL_STATE',
          payload: {
            channelId: ch.channel_id,
            label:     ch.label ?? ch.channel_id,
            source:    ch.source ?? '---',
            sourceType:ch.source_type ?? 'OTHER',
            onAir:     ch.onair ?? false,
            pfl:       ch.pfl   ?? false,
            fader:     ch.fader ?? 0,
            gain:      ch.gain  ?? 0,
            eqLow:     ch.eq_low  ?? 0,
            eqMid:     ch.eq_mid  ?? 0,
            eqHigh:    ch.eq_high ?? 0,
            compThreshold: ch.comp_threshold ?? -20,
            compRatio:     ch.comp_ratio     ?? 4,
            buses:     ch.buses ?? [],
            meter:     ch.meter ?? 0,
          },
        });
      });
    } else if (event === 'sources_list') {
      dispatch({ type: 'SOURCES_LIST', sources: msg.sources ?? [] });
    } else if (event === 'rin_tracks_list') {
      dispatch({ type: 'RIN_LIST', tracks: msg.tracks ?? [] });
    } else if (event === 'meter') {
      dispatch({ type: 'METER_UPDATE', channelId: msg.channel, level: msg.level ?? 0 });
    }
  }, []);

  const connect = useCallback((wsUrl: string, studioId: string) => {
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
    }
    dispatch({ type: 'SET_STUDIO', studioId, wsUrl });
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      dispatch({ type: 'WS_CONNECTED' });
      socket.send(JSON.stringify({
        event: 'register',
        module_id: 'android_surface',
        channels: DEFAULT_CHANNELS,
      }));
    };
    socket.onmessage = (e) => handleMessage(e.data);
    socket.onclose = () => dispatch({ type: 'WS_DISCONNECTED' });
    socket.onerror = () => dispatch({ type: 'WS_DISCONNECTED' });
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    ws.current?.close();
    ws.current = null;
  }, []);

  // ── Channel actions ───────────────────────────────────────────────────────

  const sendOnPress = useCallback((chId: string) =>
    send({ event: 'on_press', channel: chId }), [send]);

  const sendPflPress = useCallback((chId: string) =>
    send({ event: 'pfl_press', channel: chId }), [send]);

  const sendTalkbackOn = useCallback((chId: string) =>
    send({ event: 'talkback_on', channel: chId }), [send]);

  const sendTalkbackOff = useCallback((chId: string) =>
    send({ event: 'talkback_off', channel: chId }), [send]);

  const sendFader = useCallback((chId: string, value: number) =>
    send({ event: 'fader', channel: chId, value }), [send]);

  const sendSetSource = useCallback((chId: string, source: string) =>
    send({ event: 'set_source', channel: chId, source }), [send]);

  const sendBusToggle = useCallback((chId: string, bus: string) =>
    send({ event: 'bus_toggle', channel: chId, bus }), [send]);

  const sendSetGain = useCallback((chId: string, value: number) =>
    send({ event: 'set_gain', channel: chId, value }), [send]);

  const sendSetEq = useCallback((chId: string, band: 'low'|'mid'|'high', value: number) =>
    send({ event: 'set_eq', channel: chId, band, value }), [send]);

  const sendSetComp = useCallback((chId: string, param: 'threshold'|'ratio', value: number) =>
    send({ event: 'set_comp', channel: chId, param, value }), [send]);

  const sendEncoderRotate = useCallback((chId: string, delta: number) =>
    send({ event: 'encoder_rotate', channel: chId, delta }), [send]);

  // ── Menu logic (mirrors surface1.ino handleEncoderPress) ─────────────────

  const handleMenuPress = useCallback((chId: string) => {
    const ch = stateRef.current.channels[chId];
    if (!ch) return;
    const { menuState, menuIndex } = ch;
    switch (menuState) {
      case 'HOME':
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'SOURCE_SELECT', menuIndex: 0 });
        send({ event: 'get_sources' });
        break;
      case 'SOURCE_SELECT': {
        const src = stateRef.current.sources[menuIndex];
        if (src) { sendSetSource(chId, src); }
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'HOME' });
        break;
      }
      case 'MAIN':
        switch (menuIndex) {
          case 0: // SRC
            dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'SRC', menuIndex: 0 });
            send({ event: 'get_sources' });
            break;
          case 1: dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'GAIN' }); break;
          case 2: dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'EQ', menuIndex: 0 }); break;
          case 3: dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'COMP', menuIndex: 0 }); break;
          case 4: dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'BUS', menuIndex: 0 }); break;
          case 6: dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'HOME' }); break;
        }
        break;
      case 'SRC': {
        const src = stateRef.current.sources[menuIndex];
        if (src) { sendSetSource(chId, src); }
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'HOME' });
        break;
      }
      case 'GAIN':
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'MAIN', menuIndex: 1 });
        break;
      case 'EQ': {
        const nextIdx = menuIndex + 1;
        if (nextIdx >= 3) dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'MAIN', menuIndex: 2 });
        else dispatch({ type: 'SET_MENU_INDEX', channelId: chId, menuIndex: nextIdx });
        break;
      }
      case 'COMP': {
        const nextIdx = (menuIndex + 1) % 2;
        if (nextIdx === 0) dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'MAIN', menuIndex: 3 });
        else dispatch({ type: 'SET_MENU_INDEX', channelId: chId, menuIndex: nextIdx });
        break;
      }
      case 'BUS':
        sendBusToggle(chId, BUS_NAMES[menuIndex] ?? BUS_NAMES[0]);
        break;
      case 'RIN_SELECT': {
        const track = stateRef.current.rinTracks[menuIndex];
        if (track) { send({ event: 'esp32_remote_source_request', channel_id: chId, rin_track: track }); }
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'WAIT_UI' });
        break;
      }
    }
  }, [send, sendSetSource, sendBusToggle]);

  // ── Menu rotation (mirrors handleEncoderRotate) ───────────────────────────

  const handleMenuRotate = useCallback((chId: string, delta: number) => {
    const ch = stateRef.current.channels[chId];
    if (!ch) return;
    const { menuState, menuIndex } = ch;
    switch (menuState) {
      case 'HOME':
        dispatch({ type: 'SET_MENU', channelId: chId, menuState: 'MAIN', menuIndex: 0 });
        break;
      case 'SOURCE_SELECT':
      case 'MAIN':
      case 'SRC':
      case 'BUS':
      case 'RIN_SELECT': {
        const listLen = menuState === 'MAIN' ? MAIN_MENU_ITEMS.length
          : menuState === 'BUS' ? BUS_NAMES.length
          : stateRef.current.sources.length;
        const next = Math.max(0, Math.min(listLen - 1, menuIndex + delta));
        dispatch({ type: 'SET_MENU_INDEX', channelId: chId, menuIndex: next });
        break;
      }
      case 'GAIN': {
        const newGain = Math.max(-20, Math.min(20, ch.gain + delta * 0.5));
        dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, gain: newGain } });
        sendSetGain(chId, newGain);
        break;
      }
      case 'EQ': {
        const step = delta * 0.5;
        if (menuIndex === 0) {
          const v = Math.max(-12, Math.min(12, ch.eqLow + step));
          dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, eqLow: v } });
          sendSetEq(chId, 'low', v);
        } else if (menuIndex === 1) {
          const v = Math.max(-12, Math.min(12, ch.eqMid + step));
          dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, eqMid: v } });
          sendSetEq(chId, 'mid', v);
        } else {
          const v = Math.max(-12, Math.min(12, ch.eqHigh + step));
          dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, eqHigh: v } });
          sendSetEq(chId, 'high', v);
        }
        break;
      }
      case 'COMP': {
        if (menuIndex === 0) {
          const v = Math.max(-60, Math.min(0, ch.compThreshold + delta));
          dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, compThreshold: v } });
          sendSetComp(chId, 'threshold', v);
        } else {
          const v = Math.max(1, Math.min(20, ch.compRatio + delta * 0.1));
          dispatch({ type: 'CHANNEL_STATE', payload: { channelId: chId, compRatio: v } });
          sendSetComp(chId, 'ratio', v);
        }
        break;
      }
    }
  }, [sendSetGain, sendSetEq, sendSetComp]);

  const ctx: SurfaceCtx = {
    state,
    send,
    connect,
    disconnect,
    sendOnPress,
    sendPflPress,
    sendTalkbackOn,
    sendTalkbackOff,
    sendFader,
    sendSetSource,
    sendBusToggle,
    sendSetGain,
    sendSetEq,
    sendSetComp,
    sendEncoderRotate,
    handleMenuPress,
    handleMenuRotate,
    busNames: BUS_NAMES,
    mainMenuItems: MAIN_MENU_ITEMS,
  };

  return <SurfaceContext.Provider value={ctx}>{children}</SurfaceContext.Provider>;
}
