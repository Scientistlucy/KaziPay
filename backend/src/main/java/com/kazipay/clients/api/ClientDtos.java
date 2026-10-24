package com.kazipay.clients.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class ClientDtos {
    private ClientDtos() { }

    public record ClientRequest(@NotBlank @Size(max = 255) String name, @Size(max = 255) String company,
                                @Email String email, @Size(max = 30) String phone, @Email String billingEmail,
                                String address, String country, @Size(max = 50) String taxId,
                                @Pattern(regexp = "[A-Z]{3}") String defaultCurrency, @Min(0) Integer paymentTermsDays,
                                String notes) { }

    public record ClientView(UUID id, String name, String company, String email, String phone, String billingEmail,
                             String address, String country, String taxId, String defaultCurrency,
                             int paymentTermsDays, String notes, String status) { }

    public record ContactRequest(@NotBlank @Size(max = 255) String name, @Email String email,
                                 @Size(max = 30) String phone, @Size(max = 100) String roleTitle,
                                 boolean primary) { }

    public record ContactView(UUID id, UUID clientId, String name, String email, String phone,
                              String roleTitle, boolean primary) { }

    public record PortalInviteRequest(@Email @NotBlank String email) { }
}