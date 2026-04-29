export type Gender = 'MALE' | 'FEMALE';

export type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'
  | 'EXECUTIVE_BOARD'
  | 'VOLUNTEER'
  | 'INSTRUCTOR';

export type AppUser = {
  id: string; // Firebase Auth uid
  email: string;
  isActive: boolean;
  role: UserRole;
  qrToken: string;

  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO string
  gender: Gender;
  phoneNumber?: string;
  school?: string;
  profileImageUrl?: string;

  competencyIds: string[];
};