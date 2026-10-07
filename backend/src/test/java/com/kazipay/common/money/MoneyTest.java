package com.kazipay.common.money;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyTest {
    @Test
    void normalizesScaleAndCurrency() {
        var money = new Money(new BigDecimal("12.345"), "kes");

        assertThat(money.amount()).isEqualByComparingTo("12.35");
        assertThat(money.currency()).isEqualTo("KES");
    }
}