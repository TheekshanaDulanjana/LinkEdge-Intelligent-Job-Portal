export interface RegisterSeekerInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  location?: string;
}

export interface RegisterCompanyInput {
  email: string;
  password: string;
  companyName: string;
  industry?: string;
  website?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'SEEKER' | 'COMPANY' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    profile: object;
  };
}