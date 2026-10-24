package com.kazipay.clients.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kazipay.clients.api.ClientDtos;
import com.kazipay.common.api.ResourceNotFoundException;
import com.kazipay.common.audit.AuditLogger;
import com.kazipay.common.tenant.TenantAwareDataSource;
import com.kazipay.common.tenant.TenantContext;
import com.kazipay.tenant.application.EntitlementService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SimpleDriverDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.DriverManager;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Runs ClientService as the restricted app role against the real migrations to prove tenant isolation. */
@Testcontainers
class ClientIsolationIT {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("kazipay")
            .withUsername("kazipay_owner")
            .withPassword("kazipay_owner")
            .withInitScript("tenant-test-init.sql");

    static JdbcTemplate appJdbc;
    static ClientService clients;
    static UUID tenantA;
    static UUID tenantB;
    static UUID clientOfA;

    @BeforeAll
    static void setUp() throws Exception {
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()).load().migrate();
        tenantA = createTenant("acme");
        tenantB = createTenant("beta");

        var appRole = new SimpleDriverDataSource(new org.postgresql.Driver(), postgres.getJdbcUrl(), "kazipay_app", "kazipay_app");
        appJdbc = new JdbcTemplate(new TenantAwareDataSource(appRole));
        var objectMapper = new ObjectMapper();
        clients = new ClientService(appJdbc, new EntitlementService(appJdbc, objectMapper), new AuditLogger(appJdbc, objectMapper));

        clientOfA = TenantContext.runAs(tenantA, () -> clients.create(request("Acme Holdings")).id());
    }

    @Test
    void otherTenantDoesNotSeeClientInList() {
        assertThat(TenantContext.runAs(tenantB, () -> clients.list())).isEmpty();
        assertThat(TenantContext.runAs(tenantA, () -> clients.list())).extracting(ClientDtos.ClientView::id).containsExactly(clientOfA);
    }

    @Test
    void rowLevelSecurityHidesRowsEvenWithoutTenantFilterInSql() {
        assertThat(TenantContext.runAs(tenantB, () -> appJdbc.queryForObject("SELECT count(*) FROM clients", Long.class))).isZero();
        assertThat(appJdbc.queryForObject("SELECT count(*) FROM clients", Long.class)).as("no tenant context").isZero();
    }

    @Test
    void otherTenantCannotReadUpdateOrArchiveClient() {
        assertThatThrownBy(() -> TenantContext.runAs(tenantB, () -> clients.get(clientOfA)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> TenantContext.runAs(tenantB, () -> clients.update(clientOfA, request("Hijacked"))))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> TenantContext.runAs(tenantB, () -> clients.archive(clientOfA)))
                .isInstanceOf(ResourceNotFoundException.class);

        var stillIntact = TenantContext.runAs(tenantA, () -> clients.get(clientOfA));
        assertThat(stillIntact.name()).isEqualTo("Acme Holdings");
        assertThat(stillIntact.status()).isEqualTo("ACTIVE");
    }

    @Test
    void otherTenantCannotAttachContacts() {
        var contact = new ClientDtos.ContactRequest("Mallory", "mallory@example.com", null, null, false);
        assertThatThrownBy(() -> TenantContext.runAs(tenantB, () -> clients.addContact(clientOfA, contact)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void clientChangesAreAuditedForTheOwningTenant() {
        var auditRows = TenantContext.runAs(tenantA, () -> appJdbc.queryForObject(
                "SELECT count(*) FROM audit_logs WHERE entity_id = ? AND action = 'client.created'", Long.class, clientOfA));
        assertThat(auditRows).isEqualTo(1);
        assertThat(TenantContext.runAs(tenantB, () -> appJdbc.queryForObject(
                "SELECT count(*) FROM audit_logs WHERE entity_id = ?", Long.class, clientOfA))).isZero();
    }

    private static ClientDtos.ClientRequest request(String name) {
        return new ClientDtos.ClientRequest(name, null, null, null, null, null, null, null, null, null, null);
    }

    private static UUID createTenant(String slug) throws Exception {
        var id = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var insert = connection.prepareStatement("INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)")) {
            insert.setObject(1, id);
            insert.setString(2, slug);
            insert.setString(3, slug);
            insert.executeUpdate();
        }
        return id;
    }
}
