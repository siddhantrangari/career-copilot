# Strict Data Safety & Zero Accidental Loss Rule

## Policy:
1. **Mandatory Backup Before Any Modification, Migration, or Deletion**:
   - Before executing ANY script, migration, manual query, or operation that modifies (`UPDATE`), truncates (`TRUNCATE`), drops (`DROP`), or deletes (`DELETE`) database records or schema, you MUST take a complete timestamped backup first (e.g., `pg_dump` or table export to a backup file).
   - Verify the backup exists before proceeding with any changes.
2. **NO Unsolicited Deletions**: Never execute scripts, database queries (`DELETE`, `TRUNCATE`, `DROP`), or file removals (`rm -rf`) that permanently remove user data, records, or catalogue entries without explicit, direct user confirmation.
3. **Upsert & Soft-Deactivate Only**: Seeding and catalog sync operations must ONLY use `INSERT ... ON CONFLICT DO UPDATE`. They must NEVER prune or delete rows automatically.
4. **Multi-Device & State Sync**: Sync endpoints (`PUT /api/state`) must never perform bulk deletions. Only explicit user-initiated single-record deletion endpoints (`DELETE /api/tracked/:id`) are allowed.
5. **Foreign Key Safety**: User data tables (`tracked_companies`, `connections`, `notes`, `win_docs`) must be guarded against cascading deletes from catalog changes.

