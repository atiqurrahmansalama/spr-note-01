/**
 * Enterprise Auth Types & Interfaces
 * SPR Note - Suffah Hifz Management System
 */

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface InviteDetails {
  inviter_name: string;
  target_role_name: string;
  title?: string;
  id?: string | number;
  email?: string;
  [key: string]: unknown;
}

export interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

export interface RegisterFieldErrors {
  email?: string[];
  confirm_password?: string[];
  detail?: string;
  first_name?: string[];
  last_name?: string[];
  password?: string[];
  phone_number?: string[];
  [key: string]: string[] | string | undefined | null;
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  errors?: RegisterFieldErrors;
  [key: string]: unknown;
}
