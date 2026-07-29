import { createClient } from '../supabase/client';

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  status: string;
  notes: string;
  created_at: string;
}

export async function getCustomers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ralion_customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(customerData: Partial<Customer>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ralion_customers')
    .insert(customerData)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}
