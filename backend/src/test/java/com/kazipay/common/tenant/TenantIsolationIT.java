package com.kazipay.common.tenant;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.SimpleDriverDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.DriverManager;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class TenantIsolationIT {
    @Container
    static final PostgreSQLContainer<?> postgres = PostgresTestContainer.INSTANCE.withInitScript("tenant-test-init.sql");
    static TenantAwareDataSource appDataSource;
    static UUID tenantA;
    static UUID tenantB;

    @BeforeAll
    static void setUp() throws Exception {
        tenantA = UUID.randomUUID();
        tenantB = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE tenant_probe (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, value varchar(50) NOT NULL)");
            statement.execute("SELECT enable_tenant_rls('tenant_probe')");
            statement.execute("GRANT SELECT ON tenant_probe TO kazipay_app");
            try (var insert = connection.prepareStatement("INSERT INTO tenant_probe (id, tenant_id, value) VALUES (?, ?, ?), (?, ?, ?)") ) {
                insert.setObject(1, UUID.randomUUID()); insert.setObject(2, tenantA); insert.setString(3, "A");
                insert.setObject(4, UUID.randomUUID()); insert.setObject(5, tenantB); insert.setString(6, "B");
                insert.executeUpdate();
            }
        }
        var target = new SimpleDriverDataSource(new org.postgresql.Driver(), postgres.getJdbcUrl(), "kazipay_app", "kazipay_app");
        appDataSource = new TenantAwareDataSource(target);
    }

    @AfterAll
    static void clearContext() {
        TenantContext.clear();
    }

    @Test
    void tenantAOnlySeesTenantARows() throws Exception {
        TenantContext.set(tenantA);
        try (var connection = appDataSource.getConnection();
             var statement = connection.prepareStatement("SELECT value FROM tenant_probe ORDER BY value")) {
            try (var result = statement.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString("value")).isEqualTo("A");
                assertThat(result.next()).isFalse();
            }
        } finally {
            TenantContext.clear();
        }
    }
}