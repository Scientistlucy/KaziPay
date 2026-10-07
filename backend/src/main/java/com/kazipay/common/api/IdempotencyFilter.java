package com.kazipay.common.api;

import com.kazipay.common.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Component
@Order(Ordered.LOWEST_PRECEDENCE - 80)
public class IdempotencyFilter extends OncePerRequestFilter {
    private static final String HEADER = "Idempotency-Key";
    private final JdbcTemplate jdbcTemplate;

    public IdempotencyFilter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!requiresIdempotency(request) || TenantContext.get().isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        var key = request.getHeader(HEADER);
        if (key == null || key.isBlank() || key.length() > 100) {
            response.sendError(422, "Idempotency-Key is required");
            return;
        }

        var requestBody = request.getInputStream().readAllBytes();
        var requestHash = hash(requestBody);
        var tenantId = TenantContext.require();
        var cached = jdbcTemplate.query("""
                SELECT request_hash, response_status, response_body::text
                FROM idempotency_keys WHERE tenant_id = ? AND key = ? AND expires_at > now()
                """, result -> result.next() ? new CachedResponse(
                result.getString("request_hash"), result.getInt("response_status"), result.getString("response_body")) : null,
                tenantId, key);
        if (cached != null) {
            if (!cached.requestHash().equals(requestHash)) {
                response.sendError(422, "Idempotency-Key was reused with a different request");
                return;
            }
            response.setStatus(cached.responseStatus());
            response.setContentType("application/json");
            response.getWriter().write(cached.responseBody());
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO idempotency_keys (tenant_id, key, request_hash, expires_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (tenant_id, key) DO NOTHING
                """, tenantId, key, requestHash, Instant.now().plus(24, ChronoUnit.HOURS));
        var cachedResponse = new ContentCachingResponseWrapper(response);
        filterChain.doFilter(new ReplayableRequest(request, requestBody), cachedResponse);
        var body = new String(cachedResponse.getContentAsByteArray(), StandardCharsets.UTF_8);
        jdbcTemplate.update("""
                UPDATE idempotency_keys SET response_status = ?, response_body = CAST(? AS jsonb)
                WHERE tenant_id = ? AND key = ? AND request_hash = ?
                """, cachedResponse.getStatus(), body.isBlank() ? "{}" : body, tenantId, key, requestHash);
        cachedResponse.copyBodyToResponse();
    }

    private boolean requiresIdempotency(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && (
                request.getRequestURI().matches(".*/invoices(?:/generate)?$")
                        || request.getRequestURI().contains("/payments")
                        || request.getRequestURI().contains("/refund"));
    }

    private String hash(byte[] body) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private record CachedResponse(String requestHash, int responseStatus, String responseBody) {
    }

    private static final class ReplayableRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        private ReplayableRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            var input = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override public int read() { return input.read(); }
                @Override public boolean isFinished() { return input.available() == 0; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) { }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}