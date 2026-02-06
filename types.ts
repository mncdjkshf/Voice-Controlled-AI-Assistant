
export interface Transcription {
  text: string;
  sender: 'user' | 'model';
  timestamp: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface VoiceConfig {
  voiceName: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
}

export type SupportedLanguage = 'English' | 'Hindi' | 'Hinglish' | 'Spanish' | 'French' | 'German' | 'Japanese' | 'Chinese';
