package com.kazipay.common.api;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI kaziPayOpenApi() {
        return new OpenAPI().info(new Info().title("KaziPay API").version("v1")
                .description("Client portal, billing and payments API"));
    }
}