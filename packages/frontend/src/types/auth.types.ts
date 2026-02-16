export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  lastLogin?: string | null;
}

export interface AuthResponse {
  success: true;
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}
