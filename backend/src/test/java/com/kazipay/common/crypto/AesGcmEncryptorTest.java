package com.kazipay.common.crypto;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AesGcmEncryptorTest {
    private final AesGcmEncryptor encryptor = new AesGcmEncryptor(new byte[32]);

    @Test
    void encryptsAndDecryptsWithoutReturningPlaintext() {
        var encrypted = encryptor.encrypt("gateway-secret");

        assertThat(encrypted).doesNotContain("gateway-secret");
        assertThat(encryptor.decrypt(encrypted)).isEqualTo("gateway-secret");
    }

    @Test
    void usesRandomIv() {
        assertThat(encryptor.encrypt("same")).isNotEqualTo(encryptor.encrypt("same"));
    }

    @Test
    void rejectsInvalidKeyLength() {
        assertThatThrownBy(() -> new AesGcmEncryptor(Arrays.copyOf("short".getBytes(StandardCharsets.UTF_8), 16)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}