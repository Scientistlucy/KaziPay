package com.kazipay.common.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@Order(Ordered.LOWEST_PRECEDENCE - 100)
public class TenantFilter extends OncePerRequestFilter {
    private final Optional<TenantRouteResolver> routeResolver;

    public TenantFilter(Optional<TenantRouteResolver> routeResolver) {
        this.routeResolver = routeResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var tenantId = resolveAuthenticatedTenant()
                .or(() -> routeResolver.flatMap(resolver -> resolver.resolve(request)));
        tenantId.ifPresent(TenantContext::set);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private Optional<UUID> resolveAuthenticatedTenant() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof TenantPrincipal tenantPrincipal) {
            return Optional.of(tenantPrincipal.tenantId());
        }
        if (principal instanceof Jwt jwt) {
            return uuidClaim(jwt.getClaim("tid"));
        }
        if (principal instanceof Map<?, ?> claims) {
            return uuidClaim(claims.get("tid"));
        }
        return Optional.empty();
    }

    private Optional<UUID> uuidClaim(Object value) {
        if (value instanceof UUID uuid) {
            return Optional.of(uuid);
        }
        if (value instanceof String string) {
            try {
                return Optional.of(UUID.fromString(string));
            } catch (IllegalArgumentException ignored) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}