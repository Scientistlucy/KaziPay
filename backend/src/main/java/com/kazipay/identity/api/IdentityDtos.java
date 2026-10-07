package com.kazipay.identity.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class IdentityDtos {
    private IdentityDtos() { }

    public record RegisterRequest(@NotBlank @Size(max = 255) String workspaceName,
                                  @NotBlank @Pattern(regexp = "[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$") String workspaceSlug,
                                  @NotBlank @Email String email, @NotBlank @Size(min = 8, max = 128) String password,
                                  @NotBlank String firstName, @NotBlank String lastName,
                                  String timezone, @Pattern(regexp = "[A-Z]{3}") String currency) { }

    public record LoginRequest(@NotBlank String workspaceSlug, @NotBlank @Email String email, @NotBlank String password) { }

    public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8, max = 128) String password) { }

    public record TokenRequest(@NotBlank String token) { }
    public record AccountRequest(@NotBlank String workspaceSlug, @NotBlank @Email String email) { }
    public record InviteRequest(@NotBlank @Email String email, @NotBlank String role) { }
    public record AcceptInviteRequest(@NotBlank String token, @NotBlank String firstName, @NotBlank String lastName,
                                      @NotBlank @Size(min = 8, max = 128) String password) { }

    public record UserView(UUID id, String email, String firstName, String lastName, String role, boolean emailVerified) { }

    public record TenantView(UUID id, String name, String slug, String currency, String timezone) { }

    public record AuthResponse(String accessToken, long expiresIn, UserView user, TenantView tenant) { }
}