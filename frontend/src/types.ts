import { ReactNode } from "react";

export type UserRole = 'Donor' | 'NGO' | 'Government Authorizer';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified?: boolean;
}

export interface NGODetails {
  isVerified: any;
  id?: string;
  name: string;
  description: string;
  code: string;
  isApproved: boolean;
  email: string;
  UserEmail: string;
  website?: string;
  contactPhone?: string;
  address?: string;
  documentURL?: string;
  documentContent?: string; // Base64 data of the document
  documentName?: string;   // Original filename
  walletAddress?: string;
  createdAt?: Date;
}

export interface Project {
  id?: string;
  ngoEmail: string;
  ngoName: string;
  title: string;
  description: string;
  isApproved: boolean;
  createdAt?: Date;
}

export interface Donation {
  evidenceTrackingId: ReactNode;
  evidenceDescription: any;
  evidenceImages: boolean;
  isGovFunding: any;
  currency: string;
  isDirect: any;
  id?: string;
  donorAddress: string;
  donorName?: string;
  ngoEmail: string;
  ngoName: string;
  projectId: string;
  projectTitle: string;
  amount: string;
  timestamp: number;
  transactionHash: string;
}

export interface TransparencyData {
  ngo: NGODetails | null;
  projects: Project[];
  donations: Donation[];
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error?: string | null;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshingVerification: boolean;
  checkEmailVerification: () => Promise<void>;
}