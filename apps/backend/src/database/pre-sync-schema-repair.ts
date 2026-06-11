import { Client } from 'pg';

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount: number | null;
};

export type SchemaRepairClient = {
  connect?: () => Promise<void>;
  end?: () => Promise<void>;
  query: <T = Record<string, unknown>>(sql: string, parameters?: unknown[]) => Promise<QueryResult<T>>;
};

type SchemaRepairOptions = {
  clientFactory?: (databaseUrl: string) => SchemaRepairClient;
};

const SYSTEM_OWNER_EMAIL = 'system@delivreel.local';
const DISABLED_PASSWORD_HASH = '$2b$10$C6UzMDM.H6dfI/f/IKcEeO8dPtG9S9sK0SXR5IhYhQpI7CMVqvnyG';
const LEGACY_OWNER_ID_COLUMN = 'ownerIdLegacyUuid';
const INTEGER_TYPES = new Set(['integer', 'bigint', 'smallint']);
const APPLICATION_TABLES = [
  'chat_messages',
  'comments',
  'hosted_videos',
  'upload_entitlements',
  'videos',
  'project_access_links',
  'project_members',
  'projects',
  'application_settings',
  'users',
];

export async function repairPostgresSchemaBeforeSync(databaseUrl: string, options: SchemaRepairOptions = {}): Promise<void> {
  const client = options.clientFactory?.(databaseUrl) ?? new Client({ connectionString: databaseUrl });

  await client.connect?.();
  try {
    await repairProjectsOwnerId(client);
  } finally {
    await client.end?.();
  }
}

async function repairProjectsOwnerId(client: SchemaRepairClient): Promise<void> {
  if (!(await tableExists(client, 'projects'))) {
    return;
  }

  if (!(await tableExists(client, 'users'))) {
    return;
  }

  const userIdType = await columnDataType(client, 'users', 'id');
  if (userIdType && !INTEGER_TYPES.has(userIdType)) {
    await resetLegacyApplicationSchema(client, `users.id is ${userIdType}`);
    return;
  }

  await normalizeExistingUserRoles(client);

  const ownerIdExists = await columnExists(client, 'projects', 'ownerId');
  if (ownerIdExists) {
    const ownerIdType = await columnDataType(client, 'projects', 'ownerId');
    if (ownerIdType && !INTEGER_TYPES.has(ownerIdType)) {
      await moveLegacyOwnerIdColumn(client);
      await client.query('ALTER TABLE "projects" ADD COLUMN "ownerId" integer');
    }
  } else {
    await client.query('ALTER TABLE "projects" ADD COLUMN "ownerId" integer');
  }

  await backfillOwnerIdFromOwnerMembers(client);
  await ensureFallbackUserIfNeeded(client);
  await backfillRemainingOwnerIds(client);
  await assertNoNullOwnerIds(client);
  await client.query('ALTER TABLE "projects" ALTER COLUMN "ownerId" SET NOT NULL');
}

async function normalizeExistingUserRoles(client: SchemaRepairClient): Promise<void> {
  if (!(await columnExists(client, 'users', 'role'))) {
    return;
  }

  await client.query(
    `UPDATE "users"
      SET "role" = 'user'
      WHERE "role"::text NOT IN ('user', 'super_admin')`,
  );
}

async function resetLegacyApplicationSchema(client: SchemaRepairClient, reason: string): Promise<void> {
  console.warn(`Legacy schema detected (${reason}); dropping development application tables before TypeORM synchronization.`);

  for (const tableName of APPLICATION_TABLES) {
    await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
  }
}

async function moveLegacyOwnerIdColumn(client: SchemaRepairClient): Promise<void> {
  if (await columnExists(client, 'projects', LEGACY_OWNER_ID_COLUMN)) {
    await client.query('ALTER TABLE "projects" DROP COLUMN "ownerId"');
    return;
  }

  await client.query(`ALTER TABLE "projects" RENAME COLUMN "ownerId" TO "${LEGACY_OWNER_ID_COLUMN}"`);
}

async function tableExists(client: SchemaRepairClient, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`],
  );
  return !!result.rows[0]?.exists;
}

async function columnExists(client: SchemaRepairClient, tableName: string, columnName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists`,
    [tableName, columnName],
  );
  return !!result.rows[0]?.exists;
}

async function columnDataType(client: SchemaRepairClient, tableName: string, columnName: string): Promise<string | null> {
  const result = await client.query<{ data_type: string }>(
    `SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2`,
    [tableName, columnName],
  );
  return result.rows[0]?.data_type ?? null;
}

async function backfillOwnerIdFromOwnerMembers(client: SchemaRepairClient): Promise<void> {
  if (!(await tableExists(client, 'project_members'))) {
    return;
  }

  await client.query(
    `UPDATE "projects" p
      SET "ownerId" = owner_user.id
      FROM (
        SELECT DISTINCT ON (pm."projectId") pm."projectId", u.id
        FROM "project_members" pm
        JOIN "users" u ON lower(u.email) = lower(pm.email)
        WHERE pm.role = 'owner'
        ORDER BY pm."projectId", u.id ASC
      ) owner_user
      WHERE p.id = owner_user."projectId"
        AND p."ownerId" IS NULL`,
  );
}

async function ensureFallbackUserIfNeeded(client: SchemaRepairClient): Promise<void> {
  const remainingProjects = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL');
  if (Number(remainingProjects.rows[0]?.count ?? 0) === 0) {
    return;
  }

  const users = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "users"');
  if (Number(users.rows[0]?.count ?? 0) > 0) {
    return;
  }

  await client.query(
    `INSERT INTO "users" ("name", "email", "password", "isActive", "role", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, false, 'user', NOW(), NOW())`,
    ['System Owner', SYSTEM_OWNER_EMAIL, DISABLED_PASSWORD_HASH],
  );
}

async function backfillRemainingOwnerIds(client: SchemaRepairClient): Promise<void> {
  await client.query(
    `UPDATE "projects"
      SET "ownerId" = (SELECT id FROM "users" ORDER BY id ASC LIMIT 1)
      WHERE "ownerId" IS NULL`,
  );
}

async function assertNoNullOwnerIds(client: SchemaRepairClient): Promise<void> {
  const result = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "projects" WHERE "ownerId" IS NULL');
  const nullCount = Number(result.rows[0]?.count ?? 0);
  if (nullCount > 0) {
    throw new Error(`Cannot pre-sync repair projects.ownerId: ${nullCount} project(s) still have no owner.`);
  }
}
