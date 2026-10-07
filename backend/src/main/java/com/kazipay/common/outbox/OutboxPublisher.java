package com.kazipay.common.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kazipay.common.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class OutboxPublisher {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public OutboxPublisher(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID publish(OutboxEvent event) {
        var eventId = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO outbox_events (id, tenant_id, aggregate_type, aggregate_id, event_type, payload)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, eventId, event.tenantId() != null ? event.tenantId() : TenantContext.require(),
                event.aggregateType(), event.aggregateId(), event.eventType(), json(event.payload()));
        return eventId;
    }

    @Scheduled(fixedDelayString = "${kazipay.outbox.publish-delay:5000}")
    public void publishPending() {
        jdbcTemplate.query("SELECT id FROM tenants", result -> {
            var tenantId = result.getObject("id", UUID.class);
            TenantContext.runAs(tenantId, () -> jdbcTemplate.query("""
                    SELECT id FROM outbox_events
                    WHERE published_at IS NULL ORDER BY created_at LIMIT 50
                    """, events -> {
                var eventId = events.getObject("id", UUID.class);
                jdbcTemplate.update("""
                        UPDATE outbox_events SET published_at = now(), attempts = attempts + 1
                        WHERE id = ? AND published_at IS NULL
                        """, eventId);
            }));
        });
    }

    private String json(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Outbox payload is not serializable", exception);
        }
    }
}