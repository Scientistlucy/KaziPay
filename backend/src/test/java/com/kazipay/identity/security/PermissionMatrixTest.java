package com.kazipay.identity.security;

import com.kazipay.identity.domain.Permission;
import com.kazipay.identity.domain.Role;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionMatrixTest {
    private final PermissionMatrix matrix = new PermissionMatrix();

    @Test
    void ownerHasAllPermissions() {
        assertThat(matrix.has(Role.OWNER, Permission.BILLING_MANAGE)).isTrue();
        assertThat(matrix.has(Role.OWNER, Permission.PAYMENT_REFUND)).isTrue();
    }

    @Test
    void managerCannotVoidInvoicesOrManageBilling() {
        assertThat(matrix.has(Role.MANAGER, Permission.INVOICE_SEND)).isTrue();
        assertThat(matrix.has(Role.MANAGER, Permission.INVOICE_VOID)).isFalse();
        assertThat(matrix.has(Role.MANAGER, Permission.BILLING_MANAGE)).isFalse();
    }

    @Test
    void clientOnlyGetsPortalReadPermissions() {
        assertThat(matrix.has(Role.CLIENT, Permission.PROJECT_READ)).isTrue();
        assertThat(matrix.has(Role.CLIENT, Permission.INVOICE_READ)).isTrue();
        assertThat(matrix.has(Role.CLIENT, Permission.INVOICE_WRITE)).isFalse();
        assertThat(matrix.has(Role.CLIENT, Permission.PAYMENT_RECORD)).isFalse();
    }
}