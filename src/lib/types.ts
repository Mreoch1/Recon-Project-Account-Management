export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  contract_value: number;
  created_at: string;
  user_id: string;
  archived: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'contractor';
  created_at: string;
}

export interface Contractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  contract_value: number;
  created_at: string;
  user_id: string;
}

export interface ChangeOrder {
  id: string;
  project_id: string;
  contractor_id: string;
  description: string;
  project_amount: number;  // Amount that affects the project's total
  contractor_amount: number;  // Amount that affects the contractor's total
  status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  contractor_id: string;
  project_id: string;
  invoice_number: string;
  description: string;
  amount: number;
  project?: Project;
}