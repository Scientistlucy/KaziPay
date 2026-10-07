package com.kazipay.common.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kazipay.common.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditLogger {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AuditLogger(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void log(String action, String entityType, UUID entityId, Object before, Object after, UUID actorId,
                    String actorType, String ip, String userAgent, String correlationId) {
        jdbcTemplate.update("""
                INSERT INTO audit_logs
                    (tenant_id, actor_id, actor_type, action, entity_type, entity_id, before, after, ip, user_agent, correlation_id)
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS inet), ?, ?)
                """,
                TenantContext.get().orElse(null), actorId, actorType, action, entityType, entityId,
                json(before), json(after), ip, userAgent, correlationId);
    }

    private String json(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit payload is not serializable", exception);
        }
    }
}