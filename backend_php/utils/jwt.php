<?php
// Simple JWT implementation
class JWT {
    private static function getSecret() {
        $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
        error_log('Using JWT secret: ' . (strlen($secret) > 10 ? substr($secret, 0, 10) . '...' : $secret));
        return $secret;
    }

    public static function encode($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $header_encoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));

        $payload_encoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

        $signature = hash_hmac('sha256', $header_encoded . "." . $payload_encoded, self::getSecret(), true);
        $signature_encoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        $token = $header_encoded . "." . $payload_encoded . "." . $signature_encoded;
        error_log('JWT encoded successfully. Token length: ' . strlen($token));
        return $token;
    }

    public static function decode($token) {
        if (!is_string($token) || empty($token)) {
            error_log('JWT decode: token is not a valid string');
            return false;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            error_log('JWT decode: token has ' . count($parts) . ' parts, expected 3');
            return false;
        }

        $header = $parts[0];
        $payload = $parts[1];
        $signature = $parts[2];

        // Decode payload to check structure
        $payload_decoded = base64_decode(str_replace(['-', '_'], ['+', '/'], $payload), true);
        if ($payload_decoded === false) {
            error_log('JWT decode: failed to decode payload');
            return false;
        }

        $expected_signature = hash_hmac('sha256', $header . "." . $payload, self::getSecret(), true);
        $expected_signature_encoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expected_signature));

        if ($signature !== $expected_signature_encoded) {
            error_log('JWT decode: signature mismatch. Expected: ' . substr($expected_signature_encoded, 0, 20) . '..., Got: ' . substr($signature, 0, 20) . '...');
            return false;
        }

        $payload_json = json_decode($payload_decoded, true);
        if ($payload_json === null) {
            error_log('JWT decode: failed to parse payload as JSON');
            return false;
        }

        error_log('JWT decoded successfully');
        return $payload_json;
    }
}
?>