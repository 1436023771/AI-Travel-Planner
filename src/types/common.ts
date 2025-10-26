export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export interface POI {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: string;
  rating?: number;
  photos?: string[];
}

export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
}
