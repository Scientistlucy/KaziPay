package com.kazipay.common.tenant;

import org.testcontainers.containers.PostgreSQLContainer;

final class PostgresTestContainer {
    static final PostgreSQLContainer<?> INSTANCE = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("kazipay")
            .withUsername("kazipay_owner")
            .withPassword("kazipay_owner");

    private PostgresTestContainer() {
    }
}