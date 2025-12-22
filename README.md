# Prestige Logistic BPO — Portal (MVP)

This is a Next.js (App Router) + Supabase MVP that includes:
- Public **Application Form** with required uploads and speed requirements (>=100/100)
- Secure **Admin login** (Supabase Auth)
- **Admin Applications Dashboard** (list/view/update status & notes)
- Supabase Storage integration for uploads

## 1) Setup

### Create Supabase project
1. Create a new Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Create a **private** Storage bucket named: `applications`
4. Create at least one admin user:
   - Supabase Dashboard → Authentication → Users → **Add user**

### Configure env
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_EMAIL_ALLOWLIST`

## 2) Run locally
```bash
npm install
npm run dev
```

Open:
- Application: http://localhost:3000/apply
- Admin: http://localhost:3000/admin/login

## Notes
- Applicants do **not** create accounts in MVP.
- Admin pages are protected by Supabase session **and** `ADMIN_EMAIL_ALLOWLIST`.
- Files are stored in Supabase Storage and linked in DB.



## Admin view of all agent hours (approvals + CSV export)
- `/admin/hours` shows all agent time entries for a date range
- Approve / Reject entries with an optional supervisor note
- Export CSV for payroll

## Agent pay rate
- `/admin/agents` lets you set an hourly pay rate per agent
- Pay rate is used to calculate estimated pay in `/admin/hours` and in the CSV export

## Hire → Create Agent (Option A)
From the admin application detail page:
- Click **Hire & Create Login**
- The system invites the agent in Supabase Auth and emails them a password setup link
- Creates the `contractor_profiles` row (includes optional pay rate)

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.


## Occurrences (Attendance) — Option A (admin-only)
- `/admin/occurrences` lets admins record attendance/discipline occurrences:
  - Late, Call Out, No Call No Show, Early Logout, Coaching, Warning, Other
- **Agents cannot see occurrences** (no RLS policies for authenticated users on `occurrences`)
- Admin access is through server-side service role API routes

Run updated SQL in `supabase/schema.sql`.

