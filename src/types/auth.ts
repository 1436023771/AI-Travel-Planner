export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  favoriteDestinations?: string[];
  budgetRange?: {
    min: number;
    max: number;
  };
  travelStyle?: 'luxury' | 'budget' | 'moderate';
  interests?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}
