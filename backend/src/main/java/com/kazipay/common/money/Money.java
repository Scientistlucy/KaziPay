package com.kazipay.common.money;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public record Money(
    @PositiveOrZero @JsonSerialize(using = ToStringSerializer.class) BigDecimal amount,
        @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency) {

    @JsonCreator
    public Money {
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(currency, "currency");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
        currency = currency.toUpperCase(java.util.Locale.ROOT);
        if (amount.signum() < 0 || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Invalid money value");
        }
    }

}