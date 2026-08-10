# Simulated Case Officer setup

1. Start the PactFlow app and complete the normal Supabase email sign-in for the test address you want to use. This creates the durable User Profile; it does not grant authority access.
2. As a platform operator, run the following query against the linked project, replacing the placeholder with that verified address:

```sql
select public.provision_simulated_case_officer('case.officer@example.com');
```

The function is deliberately unavailable to browser roles. It adds the Profile to the seeded **PactFlow Simulation Authority** without making it a Contract Party.

3. Once a simulated dispute exists, platform operations must create a direct `authority_case_assignments` record for that officer. The RLS policy then exposes only that assigned dispute and its private evidence references; it never exposes the parties' general contract records.

The setup is for Base Sepolia prototype simulation only. It is not a real dispute-resolution organisation or a grant of legal authority.
