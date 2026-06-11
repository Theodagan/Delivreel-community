import { repairPostgresSchemaBeforeSync, SchemaRepairClient } from './pre-sync-schema-repair.js';

type MockQuery = {
  sql: string;
  parameters?: unknown[];
};

function makeClient(handler: (sql: string, parameters?: unknown[]) => { rows?: Record<string, unknown>[]; rowCount?: number | null }): SchemaRepairClient & { queries: MockQuery[]; connected: boolean; ended: boolean } {
  const client = {
    queries: [] as MockQuery[],
    connected: false,
    ended: false,
    async connect() {
      this.connected = true;
    },
    async end() {
      this.ended = true;
    },
    async query<T = Record<string, unknown>>(sql: string, parameters?: unknown[]) {
      this.queries.push({ sql, parameters });
      const result = handler(sql, parameters);
      return { rows: (result.rows ?? []) as T[], rowCount: result.rowCount ?? null };
    },
  };

  return client;
}

describe('repairPostgresSchemaBeforeSync', () => {
  it('does nothing when the projects table does not exist', async () => {
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: parameters?.[0] !== 'public.projects' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.connected).toBe(true);
    expect(client.ended).toBe(true);
    expect(client.queries).toHaveLength(1);
  });

  it('adds ownerId as nullable, backfills it, then makes it required', async () => {
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'users') {
        return { rows: [{ data_type: 'integer' }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'projects') {
        return { rows: [{ exists: false }] };
      }
      if (sql.includes('COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.queries.some((query) => query.sql.includes('ALTER TABLE "projects" ADD COLUMN "ownerId" integer'))).toBe(true);
    expect(client.queries.some((query) => query.sql.includes('FROM "project_members" pm'))).toBe(true);
    expect(client.queries.some((query) => query.sql.includes('ALTER TABLE "projects" ALTER COLUMN "ownerId" SET NOT NULL'))).toBe(true);
  });

  it('preserves an existing uuid ownerId column before creating the integer ownerId', async () => {
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'users') {
        return { rows: [{ data_type: 'integer' }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'projects' && parameters?.[1] === 'ownerId') {
        return sql.includes('SELECT data_type') ? { rows: [{ data_type: 'uuid' }] } : { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'projects' && parameters?.[1] === 'ownerIdLegacyUuid') {
        return { rows: [{ exists: false }] };
      }
      if (sql.includes('COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.queries.some((query) => query.sql.includes('RENAME COLUMN "ownerId" TO "ownerIdLegacyUuid"'))).toBe(true);
    expect(client.queries.some((query) => query.sql.includes('ALTER TABLE "projects" ADD COLUMN "ownerId" integer'))).toBe(true);
  });

  it('normalizes invalid existing user roles before TypeORM enum synchronization', async () => {
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('SELECT data_type') && parameters?.[0] === 'users') {
        return { rows: [{ data_type: 'integer' }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'users' && parameters?.[1] === 'role') {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'projects') {
        return { rows: [{ exists: false }] };
      }
      if (sql.includes('COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.queries.some((query) => query.sql.includes('WHERE "role"::text NOT IN'))).toBe(true);
  });

  it('creates a disabled fallback user when projects still need an owner and no users exist', async () => {
    let projectNullCountCalls = 0;
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'users') {
        return { rows: [{ data_type: 'integer' }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'projects') {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL')) {
        projectNullCountCalls += 1;
        return { rows: [{ count: projectNullCountCalls === 1 ? '1' : '0' }] };
      }
      if (sql.includes('COUNT(*)::text AS count FROM "users"')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.queries.some((query) => query.sql.includes('INSERT INTO "users"'))).toBe(true);
    expect(client.queries.some((query) => query.sql.includes('false, \'user\''))).toBe(true);
  });

  it('drops development application tables when users.id is still uuid', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = makeClient((sql, parameters) => {
      if (sql.includes('to_regclass')) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes('information_schema.columns') && parameters?.[0] === 'users') {
        return { rows: [{ data_type: 'uuid' }] };
      }
      return { rows: [] };
    });

    await repairPostgresSchemaBeforeSync('postgres://local', { clientFactory: () => client });

    expect(client.queries.some((query) => query.sql === 'DROP TABLE IF EXISTS "chat_messages" CASCADE')).toBe(true);
    expect(client.queries.some((query) => query.sql === 'DROP TABLE IF EXISTS "hosted_videos" CASCADE')).toBe(true);
    expect(client.queries.some((query) => query.sql === 'DROP TABLE IF EXISTS "application_settings" CASCADE')).toBe(true);
    expect(client.queries.some((query) => query.sql === 'DROP TABLE IF EXISTS "users" CASCADE')).toBe(true);
    expect(client.ended).toBe(true);
    warnSpy.mockRestore();
  });
});
