package com.kazipay.common.tenant;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class TenantDataSourceConfig {
    @Bean
    @ConfigurationProperties("spring.datasource")
    DataSourceProperties kazipayDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean(name = "unwrappedDataSource")
    @ConfigurationProperties("spring.datasource.hikari")
    DataSource unwrappedDataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }

    @Bean
    @Primary
    DataSource dataSource(DataSource unwrappedDataSource) {
        return new TenantAwareDataSource(unwrappedDataSource);
    }
}