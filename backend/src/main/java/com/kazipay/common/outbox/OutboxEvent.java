package com.kazipay.common.outbox;

import java.util.UUID;

public record OutboxEvent(UUID tenantId, String aggregateType, UUID aggregateId, String eventType, Object payload) {
}