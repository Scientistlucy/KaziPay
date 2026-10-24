package com.kazipay.clients.application;

import com.kazipay.common.api.PlanLimitReachedException;
import com.kazipay.common.api.ResourceNotFoundException;
import com.kazipay.common.audit.AuditLogger;
import com.kazipay.common.tenant.TenantContext;
import com.kazipay.tenant.application.EntitlementService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static com.kazipay.clients.api.ClientDtos.*;

@Service
public class ClientService {
    // Subscriptions arrive in Phase 2; until then every workspace is limited by the FREE plan.
    static final String CURRENT_PLAN = "FREE";
    private static final String CLIENT_COLUMNS = """
            id, name, company, email, phone, billing_email, address, country, tax_id,
            default_currency, payment_terms_days, notes, status""";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final EntitlementService entitlementService;
    private final AuditLogger auditLogger;

    public ClientService(JdbcTemplate jdbc, EntitlementService entitlementService, AuditLogger auditLogger) {
        this.jdbc = jdbc;
        this.entitlementService = entitlementService;
        this.auditLogger = auditLogger;
    }

    public List<ClientView> list() {
        return jdbc.query("SELECT " + CLIENT_COLUMNS + " FROM clients WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
                this::mapClient, TenantContext.require());
    }

    public ClientView get(UUID id) {
        var clients = jdbc.query("SELECT " + CLIENT_COLUMNS + " FROM clients WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL",
                this::mapClient, id, TenantContext.require());
        if (clients.isEmpty()) throw new ResourceNotFoundException("Client not found");
        return clients.get(0);
    }

    @Transactional
    public ClientView create(ClientRequest request) {
        var entitlement = entitlementService.check(CURRENT_PLAN, EntitlementService.Feature.CLIENTS);
        var count = jdbc.queryForObject("SELECT count(*) FROM clients WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'", Long.class, TenantContext.require());
        if (entitlement.limit() >= 0 && count >= entitlement.limit()) throw new PlanLimitReachedException("Client limit reached for the current plan");
        var id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO clients (id, tenant_id, name, company, email, phone, billing_email, address, country, tax_id,
                    default_currency, payment_terms_days, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, TenantContext.require(), request.name(), request.company(), request.email(), request.phone(), request.billingEmail(),
                request.address(), request.country(), request.taxId(), request.defaultCurrency() == null ? "KES" : request.defaultCurrency(),
                request.paymentTermsDays() == null ? 14 : request.paymentTermsDays(), request.notes());
        var created = get(id);
        audit("client.created", id, null, created);
        return created;
    }

    /** Replaces the client's details; an omitted currency or payment term keeps its current value. */
    @Transactional
    public ClientView update(UUID id, ClientRequest request) {
        var before = get(id);
        jdbc.update("""
                UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, billing_email = ?, address = ?, country = ?,
                    tax_id = ?, default_currency = COALESCE(?, default_currency),
                    payment_terms_days = COALESCE(?, payment_terms_days), notes = ?, updated_at = now()
                WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
                """, request.name(), request.company(), request.email(), request.phone(), request.billingEmail(), request.address(),
                request.country(), request.taxId(), request.defaultCurrency(), request.paymentTermsDays(), request.notes(), id, TenantContext.require());
        var after = get(id);
        audit("client.updated", id, before, after);
        return after;
    }

    @Transactional
    public void archive(UUID id) {
        var before = get(id);
        jdbc.update("UPDATE clients SET status = 'ARCHIVED', deleted_at = now(), updated_at = now() WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL", id, TenantContext.require());
        audit("client.archived", id, before, null);
    }

    public List<ContactView> listContacts(UUID clientId) {
        get(clientId);
        return jdbc.query("SELECT id, client_id, name, email, phone, role_title, is_primary FROM client_contacts WHERE client_id = ? AND tenant_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, name",
                (result, row) -> mapContact(result), clientId, TenantContext.require());
    }

    @Transactional
    public ContactView addContact(UUID clientId, ContactRequest request) {
        get(clientId);
        if (request.primary()) jdbc.update("UPDATE client_contacts SET is_primary = false WHERE client_id = ? AND tenant_id = ?", clientId, TenantContext.require());
        var id = UUID.randomUUID();
        jdbc.update("INSERT INTO client_contacts (id, tenant_id, client_id, name, email, phone, role_title, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, TenantContext.require(), clientId, request.name(), request.email(), request.phone(), request.roleTitle(), request.primary());
        var contact = jdbc.queryForObject("SELECT id, client_id, name, email, phone, role_title, is_primary FROM client_contacts WHERE id = ? AND tenant_id = ?",
                (result, row) -> mapContact(result), id, TenantContext.require());
        audit("client.contact_added", clientId, null, contact);
        return contact;
    }

    @Transactional
    public void deleteContact(UUID clientId, UUID contactId) {
        var removed = jdbc.update("UPDATE client_contacts SET deleted_at = now(), updated_at = now() WHERE id = ? AND client_id = ? AND tenant_id = ? AND deleted_at IS NULL",
                contactId, clientId, TenantContext.require());
        if (removed == 0) throw new ResourceNotFoundException("Contact not found");
        audit("client.contact_removed", clientId, Map.of("contactId", contactId), null);
    }

    /** Imports every data row or none: one invalid row or a plan limit rolls back the whole file. */
    @Transactional
    public int importCsv(String csv) {
        var records = ClientCsv.parse(csv);
        if (records.isEmpty()) return 0;
        var columns = ClientCsv.headerIndex(records.get(0));
        for (var i = 1; i < records.size(); i++) {
            var record = records.get(i);
            var name = column(record, columns, "name");
            if (name == null) throw new IllegalArgumentException("Row " + (i + 1) + ": name is required");
            var currency = column(record, columns, "defaultcurrency");
            create(new ClientRequest(name, column(record, columns, "company"), column(record, columns, "email"),
                    column(record, columns, "phone"), column(record, columns, "billingemail"), column(record, columns, "address"),
                    column(record, columns, "country"), column(record, columns, "taxid"),
                    currency == null ? null : currency.toUpperCase(Locale.ROOT), null, column(record, columns, "notes")));
        }
        return records.size() - 1;
    }

    public String exportCsv() {
        var csv = new StringBuilder(String.join(",", ClientCsv.COLUMNS)).append('\n');
        for (var client : list()) {
            csv.append(ClientCsv.row(Arrays.asList(client.name(), client.company(), client.email(), client.phone(), client.billingEmail(),
                    client.address(), client.country(), client.taxId(), client.defaultCurrency(), client.notes())));
        }
        return csv.toString();
    }

    /** Records a CLIENT-role invitation; the email that delivers the token is sent from Step 12 (notifications). */
    @Transactional
    public void portalInvite(UUID clientId, String email, UUID invitedBy) {
        get(clientId);
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        var token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        jdbc.update("INSERT INTO invitations (tenant_id, email, role, client_id, token_hash, invited_by, expires_at) VALUES (?, ?, 'CLIENT', ?, encode(digest(?, 'sha256'), 'hex'), ?, now() + interval '7 days')",
                TenantContext.require(), normalizedEmail, clientId, token, invitedBy);
        audit("client.portal_invited", clientId, null, Map.of("email", normalizedEmail));
    }

    private void audit(String action, UUID clientId, Object before, Object after) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            auditLogger.log(action, "CLIENT", clientId, before, after, UUID.fromString(jwt.getSubject()), "USER", null, null, null);
        } else {
            auditLogger.log(action, "CLIENT", clientId, before, after, null, "SYSTEM", null, null, null);
        }
    }

    private static String column(List<String> record, Map<String, Integer> columns, String name) {
        var index = columns.get(name);
        if (index == null || index >= record.size() || record.get(index).isBlank()) return null;
        return record.get(index).trim();
    }

    private ClientView mapClient(java.sql.ResultSet result, int row) throws java.sql.SQLException {
        return new ClientView(result.getObject("id", UUID.class), result.getString("name"), result.getString("company"), result.getString("email"),
                result.getString("phone"), result.getString("billing_email"), result.getString("address"), result.getString("country"),
                result.getString("tax_id"), result.getString("default_currency"), result.getInt("payment_terms_days"), result.getString("notes"), result.getString("status"));
    }

    private ContactView mapContact(java.sql.ResultSet result) throws java.sql.SQLException {
        return new ContactView(result.getObject("id", UUID.class), result.getObject("client_id", UUID.class), result.getString("name"),
                result.getString("email"), result.getString("phone"), result.getString("role_title"), result.getBoolean("is_primary"));
    }
}
