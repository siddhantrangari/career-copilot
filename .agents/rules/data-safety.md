# Strict Data Safety & Zero Accidental Loss Rule

## Policy:
1. **NO Unsolicited Deletions**: Never execute scripts, database queries (`DELETE`, `TRUNCATE`, `DROP`), or file removals (`rm -rf`) that permanently remove user data, records, or catalogue entries without explicit, direct user confirmation.
2. **Upsert & Soft-Deactivate Only**: Seeding and catalog sync operations must ONLY use `INSERT ... ON CONFLICT DO UPDATE`. They must NEVER prune or delete rows automatically.
3. **Multi-Device & State Sync**: Sync endpoints (`PUT /api/state`) must never perform bulk deletions. Only explicit user-initiated single-record deletion endpoints (`DELETE /api/tracked/:id`) are allowed.
4. **Foreign Key Safety**: User data tables (`tracked_companies`, `connections`, `notes`, `win_docs`) must be guarded against cascading deletes from catalog changes.
