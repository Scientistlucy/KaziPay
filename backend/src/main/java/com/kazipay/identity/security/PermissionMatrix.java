package com.kazipay.identity.security;

import com.kazipay.identity.domain.Permission;
import com.kazipay.identity.domain.Role;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Component("perm")
public class PermissionMatrix {
    private final Map<Role, Set<Permission>> permissions = new EnumMap<>(Role.class);

    public PermissionMatrix() {
        permissions.put(Role.OWNER, EnumSet.allOf(Permission.class));
        permissions.put(Role.ADMIN, EnumSet.complementOf(EnumSet.of(Permission.BILLING_MANAGE)));
        permissions.put(Role.MANAGER, EnumSet.of(Permission.CLIENT_READ, Permission.CLIENT_WRITE, Permission.PROJECT_READ,
                Permission.PROJECT_WRITE, Permission.TASK_WRITE, Permission.TIME_LOG, Permission.TIME_APPROVE,
                Permission.EXPENSE_APPROVE, Permission.INVOICE_READ, Permission.INVOICE_WRITE, Permission.INVOICE_SEND,
                Permission.PAYMENT_RECORD, Permission.REPORT_READ));
        permissions.put(Role.MEMBER, EnumSet.of(Permission.CLIENT_READ, Permission.PROJECT_READ, Permission.TIME_LOG));
        permissions.put(Role.CLIENT, EnumSet.of(Permission.PROJECT_READ, Permission.INVOICE_READ));
    }

    public boolean has(Role role, Permission permission) {
        return permissions.getOrDefault(role, Set.of()).contains(permission);
    }

    public boolean has(String permission) {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("PERM_" + permission));
    }
}