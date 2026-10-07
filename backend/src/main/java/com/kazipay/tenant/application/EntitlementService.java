package com.kazipay.tenant.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class EntitlementService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public EntitlementService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public Entitlement check(String planCode, Feature feature) {
        var row = jdbc.queryForMap("SELECT limits, features FROM plans WHERE code = ? AND active = true", planCode);
        try {
            var limits = objectMapper.readTree(String.valueOf(row.get("limits")));
            var features = objectMapper.readTree(String.valueOf(row.get("features")));
            return new Entitlement(planCode, feature, features.path(feature.key()).asBoolean(false), limits.path(feature.key()).asLong(-1), Map.of());
        } catch (Exception exception) {
            throw new IllegalStateException("Invalid plan configuration", exception);
        }
    }

    public enum Feature {
        CLIENTS("clients"), ACTIVE_PROJECTS("activeProjects"), USERS("users"), PAYMENTS("payments"),
        REMINDERS("reminders"), RECURRING_INVOICES("recurringInvoices"), WHITE_LABEL("whiteLabel"),
        CUSTOM_DOMAIN("customDomain"), API_ACCESS("apiAccess");
        private final String key;
        Feature(String key) { this.key = key; }
        public String key() { return key; }
    }

    public record Entitlement(String planCode, Feature feature, boolean enabled, long limit, Map<String, Long> usage) { }
}