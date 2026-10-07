package com.kazipay.tenant.application;

import com.kazipay.common.audit.AuditLogger;
import com.kazipay.common.tenant.TenantContext;
import com.kazipay.tenant.api.TenantSettingsDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static com.kazipay.tenant.api.TenantSettingsDtos.*;

@Service
public class TenantSettingsService {
    private final JdbcTemplate jdbc;
    private final AuditLogger auditLogger;

    public TenantSettingsService(JdbcTemplate jdbc, AuditLogger auditLogger) {
        this.jdbc = jdbc;
        this.auditLogger = auditLogger;
    }

    public TenantView getTenant() {
        return jdbc.queryForObject("""
                SELECT id, name, slug, logo_url, primary_color, secondary_color, timezone, default_currency,
                       locale, business_email, business_phone, address, tax_id, invoice_prefix,
                       invoice_number_format, default_terms_days
                FROM tenants WHERE id = ?
                """, (result, row) -> new TenantView(result.getObject("id", UUID.class), result.getString("name"),
                result.getString("slug"), result.getString("logo_url"), result.getString("primary_color"),
                result.getString("secondary_color"), result.getString("timezone"), result.getString("default_currency"),
                result.getString("locale"), result.getString("business_email"), result.getString("business_phone"),
                result.getString("address"), result.getString("tax_id"), result.getString("invoice_prefix"),
                result.getString("invoice_number_format"), result.getInt("default_terms_days")), TenantContext.require());
    }

    @Transactional
    public TenantView updateTenant(UpdateTenantRequest request) {
        var tenantId = TenantContext.require();
        jdbc.update("""
                UPDATE tenants SET name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, timezone = ?,
                    default_currency = ?, locale = ?, business_email = ?, business_phone = ?, address = ?, tax_id = ?, updated_at = now()
                WHERE id = ?
                """, request.name(), request.logoUrl(), request.primaryColor(), request.secondaryColor(), request.timezone(),
                request.defaultCurrency(), request.locale(), request.businessEmail(), request.businessPhone(), request.address(), request.taxId(), tenantId);
        auditLogger.log("tenant.updated", "TENANT", tenantId, null, request, null, "SYSTEM", null, null, null);
        return getTenant();
    }

    public InvoiceSettingsView getInvoiceSettings() {
        return jdbc.queryForObject("SELECT invoice_prefix, invoice_number_format, default_terms_days, next_invoice_seq FROM tenants WHERE id = ?",
                (result, row) -> new InvoiceSettingsView(result.getString("invoice_prefix"), result.getString("invoice_number_format"), result.getInt("default_terms_days"), result.getLong("next_invoice_seq")), TenantContext.require());
    }

    @Transactional
    public InvoiceSettingsView updateInvoiceSettings(InvoiceSettingsRequest request) {
        jdbc.update("UPDATE tenants SET invoice_prefix = ?, invoice_number_format = ?, default_terms_days = ?, updated_at = now() WHERE id = ?",
                request.invoicePrefix(), request.invoiceNumberFormat(), request.defaultTermsDays(), TenantContext.require());
        return getInvoiceSettings();
    }

    public java.util.List<TaxRateView> listTaxRates() {
        return jdbc.query("SELECT id, name, percent, inclusive, is_default, active FROM tenant_tax_rates WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name",
                (result, row) -> taxRate(result.getObject("id", UUID.class), result.getString("name"), result.getBigDecimal("percent"), result.getBoolean("inclusive"), result.getBoolean("is_default"), result.getBoolean("active")), TenantContext.require());
    }

    @Transactional
    public TaxRateView createTaxRate(TaxRateRequest request) {
        validatePercent(request.percent());
        var id = UUID.randomUUID();
        var tenantId = TenantContext.require();
        if (request.isDefault()) jdbc.update("UPDATE tenant_tax_rates SET is_default = false WHERE tenant_id = ?", tenantId);
        jdbc.update("INSERT INTO tenant_tax_rates (id, tenant_id, name, percent, inclusive, is_default, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, tenantId, request.name(), request.percent(), request.inclusive(), request.isDefault(), request.active());
        return new TaxRateView(id, request.name(), request.percent(), request.inclusive(), request.isDefault(), request.active());
    }

    @Transactional
    public TaxRateView updateTaxRate(UUID id, TaxRateRequest request) {
        validatePercent(request.percent());
        var tenantId = TenantContext.require();
        if (request.isDefault()) jdbc.update("UPDATE tenant_tax_rates SET is_default = false WHERE tenant_id = ? AND id <> ?", tenantId, id);
        jdbc.update("UPDATE tenant_tax_rates SET name = ?, percent = ?, inclusive = ?, is_default = ?, active = ?, updated_at = now() WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL",
                request.name(), request.percent(), request.inclusive(), request.isDefault(), request.active(), id, tenantId);
        return jdbc.queryForObject("SELECT id, name, percent, inclusive, is_default, active FROM tenant_tax_rates WHERE id = ? AND tenant_id = ?",
                (result, row) -> taxRate(result.getObject("id", UUID.class), result.getString("name"), result.getBigDecimal("percent"), result.getBoolean("inclusive"), result.getBoolean("is_default"), result.getBoolean("active")), id, tenantId);
    }

    @Transactional
    public void deleteTaxRate(UUID id) {
        jdbc.update("UPDATE tenant_tax_rates SET deleted_at = now(), active = false WHERE id = ? AND tenant_id = ?", id, TenantContext.require());
    }

    public OnboardingView getOnboarding() {
        ensureOnboardingRow();
        return jdbc.queryForObject("SELECT business_details_completed, branding_completed, tax_settings_completed, gateway_completed, first_client_completed, first_invoice_completed FROM tenant_onboarding WHERE tenant_id = ?",
                (result, row) -> new OnboardingView(result.getBoolean(1), result.getBoolean(2), result.getBoolean(3), result.getBoolean(4), result.getBoolean(5), result.getBoolean(6)), TenantContext.require());
    }

    @Transactional
    public OnboardingView updateOnboarding(OnboardingRequest request) {
        ensureOnboardingRow();
        jdbc.update("""
                UPDATE tenant_onboarding SET business_details_completed = COALESCE(?, business_details_completed),
                    branding_completed = COALESCE(?, branding_completed), tax_settings_completed = COALESCE(?, tax_settings_completed),
                    gateway_completed = COALESCE(?, gateway_completed), first_client_completed = COALESCE(?, first_client_completed),
                    first_invoice_completed = COALESCE(?, first_invoice_completed), updated_at = now() WHERE tenant_id = ?
                """, request.businessDetailsCompleted(), request.brandingCompleted(), request.taxSettingsCompleted(), request.gatewayCompleted(),
                request.firstClientCompleted(), request.firstInvoiceCompleted(), TenantContext.require());
        return getOnboarding();
    }

    private void ensureOnboardingRow() {
        jdbc.update("INSERT INTO tenant_onboarding (tenant_id) VALUES (?) ON CONFLICT (tenant_id) DO NOTHING", TenantContext.require());
    }

    private void validatePercent(BigDecimal percent) {
        if (percent == null || percent.signum() < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0) throw new IllegalArgumentException("Tax percent must be between 0 and 100");
    }

    private static TaxRateView taxRate(UUID id, String name, BigDecimal percent, boolean inclusive, boolean isDefault, boolean active) {
        return new TaxRateView(id, name, percent, inclusive, isDefault, active);
    }
}