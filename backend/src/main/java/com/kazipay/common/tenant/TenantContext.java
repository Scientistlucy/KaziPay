package com.kazipay.common.tenant;

import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public final class TenantContext {
    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void set(UUID tenantId) {
        CURRENT.set(tenantId);
    }

    public static Optional<UUID> get() {
        return Optional.ofNullable(CURRENT.get());
    }

    public static UUID require() {
        return get().orElseThrow(() -> new IllegalStateException("No tenant context"));
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static <T> T runAs(UUID tenantId, Supplier<T> action) {
        var previous = CURRENT.get();
        CURRENT.set(tenantId);
        try {
            return action.get();
        } finally {
            restore(previous);
        }
    }

    public static void runAs(UUID tenantId, Runnable action) {
        runAs(tenantId, () -> {
            action.run();
            return null;
        });
    }

    private static void restore(UUID previous) {
        if (previous == null) {
            CURRENT.remove();
        } else {
            CURRENT.set(previous);
        }
    }
}