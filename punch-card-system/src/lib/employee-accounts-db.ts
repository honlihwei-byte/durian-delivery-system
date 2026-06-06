import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type EmployeeAccountRow = {
  id: string;
  staff_id: string;
  company_id: string;
  login_email: string | null;
  login_phone: string | null;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT =
  "id, staff_id, company_id, login_email, login_phone, status, last_login_at, created_at, updated_at";

export async function getEmployeeAccountByStaffId(
  supabase: Supabase,
  staffId: string,
): Promise<EmployeeAccountRow | null> {
  const { data, error } = await supabase
    .from("employee_accounts")
    .select(SELECT)
    .eq("staff_id", staffId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data);
}

export async function findEmployeeAccountsByLogin(
  supabase: Supabase,
  identifier: string,
): Promise<
  Array<
    EmployeeAccountRow & {
      staff_name: string;
      company_name: string;
    }
  >
> {
  const email = identifier.includes("@") ? identifier.trim().toLowerCase() : null;
  const phone = !email ? identifier.replace(/\D/g, "") : null;

  let query = supabase
    .from("employee_accounts")
    .select(`${SELECT}, staff!inner(staff_name), companies!inner(name)`)
    .eq("status", "active");

  if (email) {
    query = query.ilike("login_email", email);
  } else if (phone) {
    query = query.eq("login_phone", phone);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const staff = row.staff as { staff_name?: string } | null;
    const company = row.companies as { name?: string } | null;
    return {
      ...mapRow(row),
      staff_name: String(staff?.staff_name ?? ""),
      company_name: String(company?.name ?? ""),
    };
  });
}

export async function createEmployeeAccount(
  supabase: Supabase,
  params: {
    staff_id: string;
    company_id: string;
    login_email?: string | null;
    login_phone?: string | null;
    password: string;
  },
): Promise<EmployeeAccountRow> {
  const pwdErr = validatePasswordStrength(params.password);
  if (pwdErr) throw new Error(pwdErr);

  const email = params.login_email?.trim().toLowerCase() || null;
  const phone = params.login_phone?.replace(/\D/g, "") || null;
  if (!email && !phone) {
    throw new Error("Email or phone is required.");
  }

  const { data, error } = await supabase
    .from("employee_accounts")
    .insert({
      staff_id: params.staff_id,
      company_id: params.company_id,
      login_email: email,
      login_phone: phone,
      password_hash: hashPassword(params.password),
      status: "active",
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateEmployeeAccountPassword(
  supabase: Supabase,
  accountId: string,
  password: string,
): Promise<void> {
  const pwdErr = validatePasswordStrength(password);
  if (pwdErr) throw new Error(pwdErr);
  const { error } = await supabase
    .from("employee_accounts")
    .update({
      password_hash: hashPassword(password),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
}

export async function setEmployeeAccountStatus(
  supabase: Supabase,
  accountId: string,
  status: "active" | "inactive",
): Promise<void> {
  const { error } = await supabase
    .from("employee_accounts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
}

export async function verifyEmployeeLogin(
  supabase: Supabase,
  accountId: string,
  password: string,
): Promise<EmployeeAccountRow | null> {
  const { data, error } = await supabase
    .from("employee_accounts")
    .select(`${SELECT}, password_hash`)
    .eq("id", accountId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const hash = String((data as { password_hash?: string }).password_hash ?? "");
  if (!verifyPassword(password, hash)) return null;

  await supabase
    .from("employee_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", accountId);

  return mapRow(data);
}

function mapRow(row: Record<string, unknown>): EmployeeAccountRow {
  return {
    id: String(row.id),
    staff_id: String(row.staff_id),
    company_id: String(row.company_id),
    login_email: row.login_email != null ? String(row.login_email) : null,
    login_phone: row.login_phone != null ? String(row.login_phone) : null,
    status: row.status === "inactive" ? "inactive" : "active",
    last_login_at: row.last_login_at != null ? String(row.last_login_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
