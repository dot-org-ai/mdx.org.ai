/**
 * ClickHouse Access Control Schema
 *
 * Simple service account model for multi-tenant access.
 * Tenant/namespace filtering happens at the application level.
 *
 * Users:
 * - anonymous: Read-only, no auth, for cached GET queries
 * - readonly: Authenticated read-only access
 * - tenant: Read/write for data tables, can create events/actions
 * - (default): Admin access (implied, no need to create)
 *
 * @packageDocumentation
 */

export const ACCESS_CONTROL_TABLE = 'access_control'

/**
 * Access control schema for service accounts
 *
 * Note: These statements require access_management=1 in ClickHouse config
 * and must be run by a user with ACCESS MANAGEMENT privileges.
 */
export const ACCESS_CONTROL_SCHEMA = `
-- =============================================================================
-- Roles
-- =============================================================================

-- Anonymous role: read-only, no auth, for public cached queries
CREATE ROLE IF NOT EXISTS mdxdb_anonymous;

-- Readonly role: authenticated read-only access
CREATE ROLE IF NOT EXISTS mdxdb_readonly;

-- Tenant role: read/write for data, create events/actions
CREATE ROLE IF NOT EXISTS mdxdb_tenant;

-- =============================================================================
-- Grant Permissions to Roles
-- =============================================================================

-- Anonymous: SELECT only (for cached GET queries)
GRANT SELECT ON mdxdb.Things TO mdxdb_anonymous;
GRANT SELECT ON mdxdb.Relationships TO mdxdb_anonymous;
GRANT SELECT ON mdxdb.Search TO mdxdb_anonymous;
GRANT SELECT ON mdxdb.Artifacts TO mdxdb_anonymous;
-- No access to Events/Actions for anonymous

-- Readonly: SELECT on all tables
GRANT SELECT ON mdxdb.Things TO mdxdb_readonly;
GRANT SELECT ON mdxdb.Relationships TO mdxdb_readonly;
GRANT SELECT ON mdxdb.Search TO mdxdb_readonly;
GRANT SELECT ON mdxdb.Artifacts TO mdxdb_readonly;
GRANT SELECT ON mdxdb.Events TO mdxdb_readonly;
GRANT SELECT ON mdxdb.Actions TO mdxdb_readonly;

-- Tenant: SELECT + INSERT on data tables, full access to Events/Actions
GRANT SELECT, INSERT ON mdxdb.Things TO mdxdb_tenant;
GRANT SELECT, INSERT ON mdxdb.Relationships TO mdxdb_tenant;
GRANT SELECT, INSERT ON mdxdb.Search TO mdxdb_tenant;
GRANT SELECT, INSERT ON mdxdb.Artifacts TO mdxdb_tenant;
GRANT SELECT, INSERT ON mdxdb.Events TO mdxdb_tenant;
GRANT SELECT, INSERT, ALTER UPDATE ON mdxdb.Actions TO mdxdb_tenant;

-- =============================================================================
-- Users (Service Accounts)
-- =============================================================================

-- Anonymous: no password, for public cached GET queries
CREATE USER IF NOT EXISTS anonymous
  IDENTIFIED WITH no_password
  DEFAULT ROLE mdxdb_anonymous
  SETTINGS
    readonly = 1,
    max_execution_time = 30,
    max_memory_usage = 1000000000,
    max_rows_to_read = 1000000;
`

/**
 * SQL to create readonly user with password
 * Password comes from CLICKHOUSE_READONLY_PASSWORD env var
 */
export function createReadonlyUserSQL(password: string): string {
  return `
CREATE USER IF NOT EXISTS readonly
  IDENTIFIED WITH sha256_password BY '${password.replace(/'/g, "''")}'
  DEFAULT ROLE mdxdb_readonly
  SETTINGS
    readonly = 1,
    max_execution_time = 60,
    max_memory_usage = 5000000000;
`
}

/**
 * SQL to create tenant user with password
 * Password comes from CLICKHOUSE_TENANT_PASSWORD env var
 */
export function createTenantUserSQL(password: string): string {
  return `
CREATE USER IF NOT EXISTS tenant
  IDENTIFIED WITH sha256_password BY '${password.replace(/'/g, "''")}'
  DEFAULT ROLE mdxdb_tenant
  SETTINGS
    max_execution_time = 120,
    max_memory_usage = 10000000000;
`
}

/**
 * Create all users from environment variables
 *
 * Env vars:
 * - CLICKHOUSE_READONLY_PASSWORD
 * - CLICKHOUSE_TENANT_PASSWORD
 */
export function createUsersFromEnv(env: {
  CLICKHOUSE_READONLY_PASSWORD?: string
  CLICKHOUSE_TENANT_PASSWORD?: string
}): string[] {
  const statements: string[] = []

  if (env.CLICKHOUSE_READONLY_PASSWORD) {
    statements.push(createReadonlyUserSQL(env.CLICKHOUSE_READONLY_PASSWORD))
  }

  if (env.CLICKHOUSE_TENANT_PASSWORD) {
    statements.push(createTenantUserSQL(env.CLICKHOUSE_TENANT_PASSWORD))
  }

  return statements
}

/**
 * Set password for a service account
 *
 * @param user - User name (anonymous, readonly, tenant)
 * @param password - New password
 * @returns SQL statement
 */
export function setUserPasswordSQL(user: 'readonly' | 'tenant', password: string): string {
  return `ALTER USER ${user} IDENTIFIED WITH sha256_password BY '${password.replace(/'/g, "''")}';`
}

/**
 * Update user settings
 *
 * @param user - User name
 * @param settings - Settings to update
 * @returns SQL statement
 */
export function setUserSettingsSQL(
  user: string,
  settings: Record<string, string | number>
): string {
  const settingsList = Object.entries(settings)
    .map(([key, value]) => `${key} = ${value}`)
    .join(', ')
  return `ALTER USER ${user} SETTINGS ${settingsList};`
}

/**
 * SQL to check current user and permissions
 */
export const CURRENT_USER_SQL = `
SELECT
  currentUser() as user,
  currentRoles() as roles,
  currentDatabase() as database;
`

/**
 * SQL to list all users and their roles
 */
export const LIST_USERS_SQL = `
SELECT
  name,
  default_roles_list,
  auth_type
FROM system.users
WHERE name IN ('anonymous', 'readonly', 'tenant', 'default')
ORDER BY name;
`

/**
 * SQL to check if access control is enabled
 */
export const CHECK_ACCESS_MANAGEMENT_SQL = `
SELECT value FROM system.settings WHERE name = 'access_management';
`

/**
 * SQL to verify permissions for a role
 */
export function checkRolePermissionsSQL(role: string): string {
  return `SHOW GRANTS FOR ${role};`
}

/**
 * Connection strings for each user type
 *
 * @param host - ClickHouse host
 * @param database - Database name
 * @returns Connection info for each user type
 */
export function getConnectionInfo(host: string, database = 'mdxdb') {
  return {
    anonymous: {
      description: 'Public read-only access (no auth)',
      url: `${host}/?database=${database}`,
      method: 'GET',
      auth: null,
    },
    readonly: {
      description: 'Authenticated read-only access',
      url: `${host}/?database=${database}`,
      method: 'GET or POST',
      auth: 'Basic readonly:<password>',
    },
    tenant: {
      description: 'Read/write access for applications',
      url: `${host}/?database=${database}`,
      method: 'GET or POST',
      auth: 'Basic tenant:<password>',
    },
  }
}
