package com.kazipay.common.crypto;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

public class AesGcmEncryptor {
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public AesGcmEncryptor(byte[] masterKey) {
        if (masterKey.length != 32) {
            throw new IllegalArgumentException("AES-256 master key must be 32 bytes");
        }
        this.key = new SecretKeySpec(masterKey.clone(), "AES");
    }

    public String encrypt(String plaintext) {
        try {
            var iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            var cipher = cipher(Cipher.ENCRYPT_MODE, iv);
            var ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            var combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to encrypt value", exception);
        }
    }

    public String decrypt(String encodedCiphertext) {
        try {
            var combined = Base64.getDecoder().decode(encodedCiphertext);
            if (combined.length <= IV_LENGTH) {
                throw new IllegalArgumentException("Invalid encrypted value");
            }
            var iv = Arrays.copyOfRange(combined, 0, IV_LENGTH);
            var ciphertext = Arrays.copyOfRange(combined, IV_LENGTH, combined.length);
            return new String(cipher(Cipher.DECRYPT_MODE, iv).doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unable to decrypt value", exception);
        }
    }

    private Cipher cipher(int mode, byte[] iv) throws GeneralSecurityException {
        var cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, key, new GCMParameterSpec(TAG_LENGTH, iv));
        return cipher;
    }
}