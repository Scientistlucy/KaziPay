package com.kazipay.tenant.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public final class TenantSettingsDtos {
    private TenantSettingsDtos() { }

    public record UpdateTenantRequest(@NotBlank @Size(max = 255) String name,
                                      @Size(max = 500) String logoUrl,
                                      @Pattern(regexp = "#[0-9A-Fa-f]{6}") String primaryColor,
                                      @Pattern(regexp = "#[0-9A-Fa-f]{6}") String secondaryColor,
                                      @NotBlank String timezone, @Pattern(regexp = "[A-Z]{3}") String defaultCurrency,
                                      @NotBlank String locale, @Email String businessEmail,
                                      @Size(max = 50) String businessPhone, String address, @Size(max = 50) String taxId) { }

    public record TenantView(UUID id, String name, String slug, String logoUrl, String primaryColor,
                             String secondaryColor, String timezone, String defaultCurrency, String locale,
                             String businessEmail, String businessPhone, String address, String taxId,
                             String invoicePrefix, String invoiceNumberFormat, int defaultTermsDays) { }

    public record TaxRateRequest(@NotBlank @Size(max = 50) String name, BigDecimal percent,
                                 boolean inclusive, boolean isDefault, boolean active) { }

    public record TaxRateView(UUID id, String name, BigDecimal percent, boolean inclusive,
                              boolean isDefault, boolean active) { }

    public record InvoiceSettingsRequest(@NotBlank @Size(max = 10) String invoicePrefix,
                                         @NotBlank @Size(max = 50) String invoiceNumberFormat,
                                         @Min(0) int defaultTermsDays) { }

    public record InvoiceSettingsView(String invoicePrefix, String invoiceNumberFormat, int defaultTermsDays,
                                      long nextInvoiceSequence) { }

    public record OnboardingView(boolean businessDetailsCompleted, boolean brandingCompleted,
                                 boolean taxSettingsCompleted, boolean gatewayCompleted,
                                 boolean firstClientCompleted, boolean firstInvoiceCompleted) { }

    public record OnboardingRequest(Boolean businessDetailsCompleted, Boolean brandingCompleted,
                                    Boolean taxSettingsCompleted, Boolean gatewayCompleted,
                                    Boolean firstClientCompleted, Boolean firstInvoiceCompleted) { }
}