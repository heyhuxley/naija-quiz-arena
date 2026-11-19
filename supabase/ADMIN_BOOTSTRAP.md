# One-time administrator setup

Do this once for the initial project administrator. Do not expose the operation in signup or the application UI.

1. Create the administrator's account through Supabase Auth and have them confirm their email.
2. In the Supabase SQL Editor, look up that account's UUID in `auth.users` using its confirmed email.
3. Run the following statement with the UUID copied from the Auth user record:

```sql
insert into public.project_admins (user_id)
values ('00000000-0000-0000-0000-000000000000');
```

Replace the example UUID before running. The administrator role table has row-level security enabled, and the application has no insert or update grant for it. Later role changes must be performed by a trusted project operator in the database.
