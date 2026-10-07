package com.kazipay.identity.application;

import com.kazipay.common.tenant.TenantContext;
import com.kazipay.identity.api.IdentityDtos;
import com.kazipay.identity.domain.Role;
import com.kazipay.identity.security.JwtService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class IdentityService {
    private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public IdentityService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthenticatedSession register(IdentityDtos.RegisterRequest request, String userAgent, String ip) {
        var tenantId = UUID.randomUUID();
        var userId = UUID.randomUUID();
        var email = normalizeEmail(request.email());
        var slug = request.workspaceSlug().toLowerCase(java.util.Locale.ROOT);
        if (Setups.RESERVED_SLUGS.contains(slug)) throw new IllegalArgumentException("Workspace slug is reserved");
        validatePassword(request.password());
        try {
            jdbc.update("INSERT INTO tenants (id, name, slug, timezone, default_currency) VALUES (?, ?, ?, ?, ?)",
                    tenantId, request.workspaceName(), slug, request.timezone() == null ? "Africa/Nairobi" : request.timezone(),
                    request.currency() == null ? "KES" : request.currency());
            TenantContext.runAs(tenantId, () -> jdbc.update("""
                    INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role)
                    VALUES (?, ?, ?, ?, ?, ?, 'OWNER')
                    """, userId, tenantId, email, passwordEncoder.encode(request.password()), request.firstName(), request.lastName()));
                    issueOneTimeToken(tenantId, userId, "EMAIL_VERIFY", Duration.ofDays(1));
        } catch (DuplicateKeyException exception) {
            throw new IllegalArgumentException("Workspace or email already exists");
        }
        return issueSession(new UserRecord(userId, tenantId, email, request.firstName(), request.lastName(), Role.OWNER, false, 0, null), userAgent, ip);
    }

    @Transactional
    public AuthenticatedSession login(IdentityDtos.LoginRequest request, String userAgent, String ip) {
        var tenant = jdbc.queryForObject("SELECT id, name, slug, default_currency, timezone FROM tenants WHERE slug = ? AND status = 'ACTIVE'", (result, row) ->
                new TenantRecord(result.getObject("id", UUID.class), result.getString("name"), result.getString("slug"), result.getString("default_currency"), result.getString("timezone")), request.workspaceSlug().toLowerCase());
        var user = TenantContext.runAs(tenant.id(), () -> jdbc.queryForObject("""
                SELECT id, tenant_id, email, password_hash, first_name, last_name, role, email_verified_at, failed_login_count, locked_until
                FROM users WHERE tenant_id = ? AND lower(email) = lower(?) AND deleted_at IS NULL
                """, (result, row) -> new UserRecord(result.getObject("id", UUID.class), result.getObject("tenant_id", UUID.class),
                result.getString("email"), result.getString("first_name"), result.getString("last_name"),
                Role.valueOf(result.getString("role")), result.getTimestamp("email_verified_at") != null,
                result.getInt("failed_login_count"), result.getTimestamp("locked_until")), tenant.id(), normalizeEmail(request.email())));
        if (user.lockedUntil() != null && user.lockedUntil().toInstant().isAfter(Instant.now())) throw new IllegalArgumentException("Invalid credentials");
        var passwordHash = TenantContext.runAs(tenant.id(), () -> jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, user.id()));
        if (passwordHash == null || !passwordEncoder.matches(request.password(), passwordHash)) {
            TenantContext.runAs(tenant.id(), () -> jdbc.update("UPDATE users SET failed_login_count = failed_login_count + 1, locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN now() + make_interval(secs => power(2, least(failed_login_count - 4, 6))::int) ELSE locked_until END WHERE id = ?", user.id()));
            throw new IllegalArgumentException("Invalid credentials");
        }
        TenantContext.runAs(tenant.id(), () -> jdbc.update("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE id = ?", user.id()));
        return issueSession(user, userAgent, ip);
    }

    @Transactional
    public AuthenticatedSession rotate(String refreshToken, String userAgent, String ip) {
        var hash = hash(refreshToken);
        var token = jdbc.queryForObject("SELECT id, tenant_id, user_id, family_id, expires_at, revoked_at FROM resolve_refresh_token(?)", (result, row) ->
                new RefreshRecord(result.getObject("id", UUID.class), result.getObject("tenant_id", UUID.class), result.getObject("user_id", UUID.class), result.getObject("family_id", UUID.class), result.getTimestamp("expires_at").toInstant(), result.getTimestamp("revoked_at")), hash);
        if (token.revokedAt() != null) {
            TenantContext.runAs(token.tenantId(), () -> jdbc.update("UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now()) WHERE family_id = ?", token.familyId()));
            throw new IllegalArgumentException("Refresh token reuse detected");
        }
        if (token.expiresAt().isBefore(Instant.now())) throw new IllegalArgumentException("Refresh token expired");
        var user = TenantContext.runAs(token.tenantId(), () -> jdbc.queryForObject("SELECT id, tenant_id, email, first_name, last_name, role, email_verified_at FROM users WHERE id = ? AND is_active = true", (result, row) ->
                new UserRecord(result.getObject("id", UUID.class), result.getObject("tenant_id", UUID.class), result.getString("email"), result.getString("first_name"), result.getString("last_name"), Role.valueOf(result.getString("role")), result.getTimestamp("email_verified_at") != null, 0, null), token.userId()));
        var session = issueSession(user, userAgent, ip, token.familyId());
        jdbc.update("UPDATE refresh_tokens SET revoked_at = now(), replaced_by = ? WHERE id = ?", session.refreshId(), token.id());
        return session;
    }

    @Transactional
    public void logout(String refreshToken) {
        var token = jdbc.queryForObject("SELECT tenant_id FROM resolve_refresh_token(?)", UUID.class, hash(refreshToken));
        TenantContext.runAs(token, () -> jdbc.update("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = ?", hash(refreshToken)));
    }

    public IdentityDtos.UserView currentUser(UUID userId) {
        var user = jdbc.queryForObject("SELECT id, email, first_name, last_name, role, email_verified_at FROM users WHERE id = ?", (result, row) ->
                new IdentityDtos.UserView(result.getObject("id", UUID.class), result.getString("email"), result.getString("first_name"), result.getString("last_name"), result.getString("role"), result.getTimestamp("email_verified_at") != null), userId);
        return user;
    }

    public IdentityDtos.TenantView tenant(UUID tenantId) {
        return jdbc.queryForObject("SELECT id, name, slug, default_currency, timezone FROM tenants WHERE id = ?", (result, row) ->
                new IdentityDtos.TenantView(result.getObject("id", UUID.class), result.getString("name"), result.getString("slug"), result.getString("default_currency"), result.getString("timezone")), tenantId);
    }

    @Transactional
    public String issueOneTimeToken(UUID tenantId, UUID userId, String purpose, Duration lifetime) {
        var raw = randomToken();
        TenantContext.runAs(tenantId, () -> jdbc.update("INSERT INTO one_time_tokens (tenant_id, user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)", tenantId, userId, purpose, hash(raw), Timestamp.from(Instant.now().plus(lifetime))));
        return raw;
    }

    @Transactional
    public UUID consumeOneTimeToken(String raw, String purpose) {
        var token = jdbc.queryForObject("SELECT id, tenant_id, user_id FROM resolve_one_time_token(?, ?)", (result, row) ->
                new OneTimeRecord(result.getObject("id", UUID.class), result.getObject("tenant_id", UUID.class), result.getObject("user_id", UUID.class)), hash(raw), purpose);
        TenantContext.runAs(token.tenantId(), () -> jdbc.update("UPDATE one_time_tokens SET used_at = now() WHERE id = ? AND used_at IS NULL", token.id()));
        return token.userId();
    }

    @Transactional
    public void requestPasswordReset(IdentityDtos.AccountRequest request) {
        var tenant = jdbc.queryForObject("SELECT id FROM tenants WHERE slug = ? AND status = 'ACTIVE'", UUID.class, request.workspaceSlug().toLowerCase());
        TenantContext.runAs(tenant, () -> jdbc.query("SELECT id FROM users WHERE tenant_id = ? AND lower(email) = lower(?) AND is_active = true", result -> {
            if (result.next()) issueOneTimeToken(tenant, result.getObject("id", UUID.class), "PASSWORD_RESET", Duration.ofMinutes(30));
        }, tenant, normalizeEmail(request.email())));
    }

    @Transactional
    public void requestMagicLink(IdentityDtos.AccountRequest request) {
        var tenant = jdbc.queryForObject("SELECT id FROM tenants WHERE slug = ? AND status = 'ACTIVE'", UUID.class, request.workspaceSlug().toLowerCase());
        TenantContext.runAs(tenant, () -> jdbc.query("SELECT id FROM users WHERE tenant_id = ? AND lower(email) = lower(?) AND role = 'CLIENT' AND is_active = true", result -> {
            if (result.next()) issueOneTimeToken(tenant, result.getObject("id", UUID.class), "MAGIC_LOGIN", Duration.ofMinutes(15));
        }, tenant, normalizeEmail(request.email())));
    }

    @Transactional
    public void updatePassword(UUID userId, String password) {
        validatePassword(password);
        jdbc.update("UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?", passwordEncoder.encode(password), userId);
    }

    @Transactional
    public void verifyEmail(UUID userId) {
        jdbc.update("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = ?", userId);
    }

    @Transactional
    public void invite(IdentityDtos.InviteRequest request, UUID invitedBy) {
        var tenantId = TenantContext.require();
        var role = Role.valueOf(request.role());
        if (role == Role.OWNER || role == Role.CLIENT) throw new IllegalArgumentException("This role cannot be invited here");
        var raw = randomToken();
        jdbc.update("INSERT INTO invitations (tenant_id, email, role, token_hash, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
                tenantId, normalizeEmail(request.email()), role.name(), hash(raw), invitedBy, Timestamp.from(Instant.now().plus(Duration.ofDays(7))));
    }

    @Transactional
    public AuthenticatedSession acceptInvitation(IdentityDtos.AcceptInviteRequest request, String userAgent, String ip) {
        validatePassword(request.password());
        var invitation = jdbc.queryForObject("SELECT id, tenant_id, email, role, invited_by FROM resolve_invitation_token(?)", (result, row) ->
                new InvitationRecord(result.getObject("id", UUID.class), result.getObject("tenant_id", UUID.class), result.getString("email"), Role.valueOf(result.getString("role")), result.getObject("invited_by", UUID.class)), hash(request.token()));
        var userId = UUID.randomUUID();
        TenantContext.runAs(invitation.tenantId(), () -> {
            jdbc.update("INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, now())",
                    userId, invitation.tenantId(), invitation.email(), passwordEncoder.encode(request.password()), request.firstName(), request.lastName(), invitation.role().name());
            jdbc.update("UPDATE invitations SET accepted_at = now() WHERE id = ? AND accepted_at IS NULL", invitation.id());
        });
        return issueSession(new UserRecord(userId, invitation.tenantId(), invitation.email(), request.firstName(), request.lastName(), invitation.role(), true, 0, null), userAgent, ip);
    }

    private AuthenticatedSession issueSession(UserRecord user, String userAgent, String ip) { return issueSession(user, userAgent, ip, UUID.randomUUID()); }
    private AuthenticatedSession issueSession(UserRecord user, String userAgent, String ip, UUID familyId) {
        var raw = randomToken();
        var refreshId = UUID.randomUUID();
        TenantContext.runAs(user.tenantId(), () -> jdbc.update("INSERT INTO refresh_tokens (id, tenant_id, user_id, family_id, token_hash, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS inet))", refreshId, user.tenantId(), user.id(), familyId, hash(raw), Timestamp.from(Instant.now().plus(REFRESH_TOKEN_TTL)), userAgent, ip));
        var access = jwtService.issueAccessToken(new JwtService.AuthUser(user.id(), user.tenantId(), user.email(), user.role()), ACCESS_TOKEN_TTL);
        return new AuthenticatedSession(access, raw, refreshId, user, ACCESS_TOKEN_TTL.toSeconds());
    }

    private void validatePassword(String password) {
        if (!password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,128}$")) throw new IllegalArgumentException("Password must contain upper, lower, and numeric characters");
    }
    private String normalizeEmail(String email) { return email.trim().toLowerCase(java.util.Locale.ROOT); }
    private String randomToken() { var bytes = new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private String hash(String value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch (Exception e) { throw new IllegalStateException(e); } }

    public record AuthenticatedSession(String accessToken, String refreshToken, UUID refreshId, UserRecord user, long expiresIn) { }
    public record UserRecord(UUID id, UUID tenantId, String email, String firstName, String lastName, Role role, boolean verified, int failedLoginCount, Timestamp lockedUntil) { }
    public record TenantRecord(UUID id, String name, String slug, String currency, String timezone) { }
    private record RefreshRecord(UUID id, UUID tenantId, UUID userId, UUID familyId, Instant expiresAt, Timestamp revokedAt) { }
    private record OneTimeRecord(UUID id, UUID tenantId, UUID userId) { }
    private record InvitationRecord(UUID id, UUID tenantId, String email, Role role, UUID invitedBy) { }
    private static final class Setups { private static final java.util.Set<String> RESERVED_SLUGS = java.util.Set.of("www", "api", "admin", "app", "mail", "support"); }
}