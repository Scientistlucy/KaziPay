package com.kazipay.common.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var limit = limitFor(request);
        var bucket = buckets.computeIfAbsent(requestKey(request), ignored -> newBucket(limit));
        var probe = bucket.tryConsumeAndReturnRemaining(1);
        response.setHeader("RateLimit-Limit", String.valueOf(limit));
        response.setHeader("RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
        if (!probe.isConsumed()) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private int limitFor(HttpServletRequest request) {
        var path = request.getRequestURI();
        if (path.contains("/auth/login")) return 5;
        if (path.contains("/payments") || path.contains("/pay/")) return 10;
        if (path.contains("/public/")) return 30;
        return 100;
    }

    private String requestKey(HttpServletRequest request) {
        return request.getRemoteAddr() + ":" + request.getRequestURI();
    }

    private Bucket newBucket(int limit) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofMinutes(1))))
                .build();
    }
}