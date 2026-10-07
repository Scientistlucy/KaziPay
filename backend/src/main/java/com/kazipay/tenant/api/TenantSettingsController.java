package com.kazipay.tenant.api;

import com.kazipay.tenant.application.TenantSettingsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

import static com.kazipay.tenant.api.TenantSettingsDtos.*;

@RestController
@RequestMapping("/api/v1/tenant")
public class TenantSettingsController {
    private final TenantSettingsService service;

    public TenantSettingsController(TenantSettingsService service) { this.service = service; }

    @GetMapping
    public TenantView getTenant() { return service.getTenant(); }

    @PutMapping
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public TenantView updateTenant(@Valid @RequestBody UpdateTenantRequest request) { return service.updateTenant(request); }

    @GetMapping("/invoice-settings")
    public InvoiceSettingsView getInvoiceSettings() { return service.getInvoiceSettings(); }

    @PutMapping("/invoice-settings")
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public InvoiceSettingsView updateInvoiceSettings(@Valid @RequestBody InvoiceSettingsRequest request) { return service.updateInvoiceSettings(request); }

    @GetMapping("/tax-rates")
    public List<TaxRateView> listTaxRates() { return service.listTaxRates(); }

    @PostMapping("/tax-rates")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public TaxRateView createTaxRate(@Valid @RequestBody TaxRateRequest request) { return service.createTaxRate(request); }

    @PutMapping("/tax-rates/{id}")
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public TaxRateView updateTaxRate(@PathVariable UUID id, @Valid @RequestBody TaxRateRequest request) { return service.updateTaxRate(id, request); }

    @DeleteMapping("/tax-rates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public void deleteTaxRate(@PathVariable UUID id) { service.deleteTaxRate(id); }

    @GetMapping("/onboarding")
    public OnboardingView getOnboarding() { return service.getOnboarding(); }

    @PutMapping("/onboarding")
    @PreAuthorize("@perm.has('SETTINGS_MANAGE')")
    public OnboardingView updateOnboarding(@RequestBody OnboardingRequest request) { return service.updateOnboarding(request); }
}