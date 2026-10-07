package com.kazipay.identity.api;

import com.kazipay.identity.application.IdentityService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.UUID;

import static com.kazipay.identity.api.IdentityDtos.*;

@RestController
@RequestMapping("/api/v1")
public class IdentityController {
    private static final String REFRESH_COOKIE = "kp_refresh";
    private final IdentityService identityService;

    public IdentityController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @PostMapping("/auth/register-workspace")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http, HttpServletResponse response) {
        var session = identityService.register(request, http.getHeader("User-Agent"), http.getRemoteAddr());
        setRefreshCookie(response, session.refreshToken());
        return response(session);
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        var session = identityService.login(request, http.getHeader("User-Agent"), http.getRemoteAddr());
        setRefreshCookie(response, session.refreshToken());
        return response(session);
    }

    @PostMapping("/auth/refresh")
    public AuthResponse refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String token,
                                HttpServletRequest http, HttpServletResponse response) {
        if (token == null || !"kazipay".equals(http.getHeader("X-Requested-With"))) throw new IllegalArgumentException("Invalid refresh request");
        var session = identityService.rotate(token, http.getHeader("User-Agent"), http.getRemoteAddr());
        setRefreshCookie(response, session.refreshToken());
        return response(session);
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token, HttpServletResponse response) {
        if (token != null) identityService.logout(token);
        var cookie = new Cookie(REFRESH_COOKIE, ""); cookie.setMaxAge(0); cookie.setPath("/api/v1/auth"); response.addCookie(cookie);
    }

    @PostMapping("/auth/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody TokenRequest request) {
        var userId = identityService.consumeOneTimeToken(request.token(), "EMAIL_VERIFY");
        identityService.verifyEmail(userId);
    }

    @PostMapping("/auth/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgotPassword(@Valid @RequestBody AccountRequest request) {
        identityService.requestPasswordReset(request);
    }

    @PostMapping("/auth/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        var userId = identityService.consumeOneTimeToken(request.token(), "PASSWORD_RESET");
        identityService.updatePassword(userId, request.password());
    }

    @PostMapping("/auth/magic-link")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void magicLink(@Valid @RequestBody AccountRequest request) {
        identityService.requestMagicLink(request);
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void invite(@Valid @RequestBody InviteRequest request, Authentication authentication) {
        identityService.invite(request, userId(authentication));
    }

    @PostMapping("/invitations/{token}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse acceptInvitation(@PathVariable String token, @Valid @RequestBody AcceptInviteRequest request,
                                         HttpServletRequest http, HttpServletResponse response) {
        var accepted = new AcceptInviteRequest(token, request.firstName(), request.lastName(), request.password());
        var session = identityService.acceptInvitation(accepted, http.getHeader("User-Agent"), http.getRemoteAddr());
        setRefreshCookie(response, session.refreshToken());
        return response(session);
    }

    @GetMapping("/me")
    public UserView me(Authentication authentication) {
        return identityService.currentUser(userId(authentication));
    }

    private AuthResponse response(IdentityService.AuthenticatedSession session) {
        var user = session.user();
        return new AuthResponse(session.accessToken(), session.expiresIn(),
                new UserView(user.id(), user.email(), user.firstName(), user.lastName(), user.role().name(), user.verified()),
                identityService.tenant(user.tenantId()));
    }

    private UUID userId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof Jwt jwt) return UUID.fromString(jwt.getSubject());
        return UUID.fromString(authentication.getName());
    }

    private void setRefreshCookie(HttpServletResponse response, String token) {
        var cookie = new Cookie(REFRESH_COOKIE, token);
        cookie.setHttpOnly(true); cookie.setSecure(true); cookie.setPath("/api/v1/auth"); cookie.setMaxAge((int) Duration.ofDays(30).toSeconds());
        response.addCookie(cookie);
    }
}