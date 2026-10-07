package com.kazipay.common.tenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantContextTest {
    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    @Test
    void restoresPreviousTenantAfterRunAs() {
        var outer = UUID.randomUUID();
        var inner = UUID.randomUUID();
        TenantContext.set(outer);

        TenantContext.runAs(inner, () -> assertThat(TenantContext.require()).isEqualTo(inner));

        assertThat(TenantContext.require()).isEqualTo(outer);
    }

    @Test
    void requireFailsWithoutTenant() {
        assertThatThrownBy(TenantContext::require)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("No tenant context");
    }
}