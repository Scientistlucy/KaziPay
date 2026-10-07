package com.kazipay.tenant.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EntitlementServiceTest {
    @Test
    void readsPlanFeatureAndLimit() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap("SELECT limits, features FROM plans WHERE code = ? AND active = true", "PROFESSIONAL"))
                .thenReturn(Map.of("limits", "{\"users\":10}", "features", "{\"payments\":true}"));

        var entitlement = new EntitlementService(jdbc, new ObjectMapper())
                .check("PROFESSIONAL", EntitlementService.Feature.PAYMENTS);

        assertThat(entitlement.enabled()).isTrue();
        assertThat(entitlement.limit()).isEqualTo(-1);
    }

    @Test
    void disabledFeatureReturnsFalse() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap("SELECT limits, features FROM plans WHERE code = ? AND active = true", "FREE"))
                .thenReturn(Map.of("limits", "{\"clients\":1}", "features", "{\"payments\":false}"));

        var entitlement = new EntitlementService(jdbc, new ObjectMapper())
                .check("FREE", EntitlementService.Feature.PAYMENTS);

        assertThat(entitlement.enabled()).isFalse();
    }
}