package com.kazipay.identity.security;

import com.kazipay.identity.domain.Role;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final com.nimbusds.jose.jwk.RSAKey signingKey;

    public JwtService(JwtEncoder encoder, com.nimbusds.jose.jwk.RSAKey signingKey) {
        this.encoder = encoder;
        this.signingKey = signingKey;
    }

    public String issueAccessToken(AuthUser user, Duration lifetime) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("https://api.kazipay.app")
                .subject(user.id().toString()).claim("tid", user.tenantId().toString())
                .claim("role", user.role().name()).claim("email", user.email())
                .id(UUID.randomUUID().toString()).issuedAt(now).expiresAt(now.plus(lifetime)).build();
        var header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public record AuthUser(UUID id, UUID tenantId, String email, Role role) { }
}