package com.kazipay.common.tenant;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.DriverManager;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class SchemaIntegrityTest {
    @Container
    static final PostgreSQLContainer<?> postgres = PostgresTestContainer.INSTANCE.withInitScript("tenant-test-init.sql");

    @BeforeAll
    static void migrate() {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .load()
                .migrate();
    }

    @Test
    void tenantTablesHaveForcedRls() throws Exception {
        var globalTables = Set.of("tenants", "plans", "public_links");
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement();
             var result = statement.executeQuery("""
                     SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
                     FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                     WHERE n.nspname = 'public' AND c.relkind = 'r'
                       AND EXISTS (SELECT 1 FROM information_schema.columns i
                                  WHERE i.table_schema = 'public' AND i.table_name = c.relname AND i.column_name = 'tenant_id')
                     """)) {
            while (result.next()) {
                if (!globalTables.contains(result.getString("relname"))) {
                    assertThat(result.getBoolean("relrowsecurity")).as(result.getString("relname")).isTrue();
                    assertThat(result.getBoolean("relforcerowsecurity")).as(result.getString("relname")).isTrue();
                }
            }
        }
    }

    @Test
    void appRoleCannotBypassRlsOrOwnTables() throws Exception {
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement();
             var result = statement.executeQuery("""
                     SELECT r.rolsuper, r.rolbypassrls,
                            EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = r.oid AND c.relnamespace = 'public'::regnamespace) AS owns_public_table
                     FROM pg_roles r WHERE r.rolname = 'kazipay_app'
                     """)) {
            assertThat(result.next()).isTrue();
            assertThat(result.getBoolean("rolsuper")).isFalse();
            assertThat(result.getBoolean("rolbypassrls")).isFalse();
            assertThat(result.getBoolean("owns_public_table")).isFalse();
        }
    }
}