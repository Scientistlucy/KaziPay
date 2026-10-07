package com.kazipay.common.tenant;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;
import java.util.UUID;

@FunctionalInterface
public interface TenantRouteResolver {
    Optional<UUID> resolve(HttpServletRequest request);
}