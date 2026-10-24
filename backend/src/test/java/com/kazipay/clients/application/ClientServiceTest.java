package com.kazipay.clients.application;

import com.kazipay.clients.api.ClientDtos;
import com.kazipay.common.api.PlanLimitReachedException;
import com.kazipay.common.api.ResourceNotFoundException;
import com.kazipay.common.audit.AuditLogger;
import com.kazipay.common.tenant.TenantContext;
import com.kazipay.tenant.application.EntitlementService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ClientServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EntitlementService entitlements = mock(EntitlementService.class);
    private final AuditLogger auditLogger = mock(AuditLogger.class);
    private final ClientService service = new ClientService(jdbc, entitlements, auditLogger);

    @BeforeEach
    void setTenant() { TenantContext.set(UUID.randomUUID()); }

    @AfterEach
    void clearTenant() { TenantContext.clear(); }

    @Test
    void freePlanRejectsSecondActiveClient() {
        when(entitlements.check("FREE", EntitlementService.Feature.CLIENTS))
                .thenReturn(new EntitlementService.Entitlement("FREE", EntitlementService.Feature.CLIENTS, true, 1, Map.of()));
        when(jdbc.queryForObject(eq("SELECT count(*) FROM clients WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'"), eq(Long.class), any(UUID.class)))
                .thenReturn(1L);

        var request = new ClientDtos.ClientRequest("Second client", null, "second@example.com", null, null, null, null, null, "KES", 14, null);
        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(PlanLimitReachedException.class)
                .hasMessage("Client limit reached for the current plan");
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void missingClientIsNotFound() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.get(UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Client not found");
    }

    @Test
    void archivingMissingClientIsNotFoundAndNotAudited() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.archive(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(auditLogger);
    }

    @Test
    void removingMissingContactIsNotFound() {
        when(jdbc.update(anyString(), any(), any(), any())).thenReturn(0);

        assertThatThrownBy(() -> service.deleteContact(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Contact not found");
    }

    @Test
    void importRejectsRowWithoutNameBeforeWritingAnything() {
        assertThatThrownBy(() -> service.importCsv("name,email\n,nobody@example.com\n"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Row 2: name is required");
        verifyNoInteractions(entitlements);
    }

    @Test
    void importRequiresNameColumn() {
        assertThatThrownBy(() -> service.importCsv("email\na@example.com\n"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name column");
    }
}
