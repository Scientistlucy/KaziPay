package com.kazipay.common.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Base64;

@Configuration
public class CryptoConfig {
    @Bean
    @ConditionalOnProperty(prefix = "kazipay.crypto", name = "master-key")
    AesGcmEncryptor aesGcmEncryptor(@Value("${kazipay.crypto.master-key}") String masterKey) {
        return new AesGcmEncryptor(Base64.getDecoder().decode(masterKey));
    }
}