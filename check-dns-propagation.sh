#!/bin/bash
# DNS Propagation Checker for spokewheel.app

DOMAIN="spokewheel.app"
EXPECTED_IP="178.42.255.55"

echo "🔍 Checking DNS propagation for $DOMAIN"
echo "Expected IP: $EXPECTED_IP"
echo ""

# Check from multiple DNS servers
echo "Checking from different DNS servers:"
echo "-----------------------------------"

# Google DNS
GOOGLE_IP=$(dig @8.8.8.8 +short $DOMAIN | head -1)
echo "Google DNS (8.8.8.8):     $GOOGLE_IP"

# Cloudflare DNS
CLOUDFLARE_IP=$(dig @1.1.1.1 +short $DOMAIN | head -1)
echo "Cloudflare DNS (1.1.1.1): $CLOUDFLARE_IP"

# Quad9 DNS
QUAD9_IP=$(dig @9.9.9.9 +short $DOMAIN | head -1)
echo "Quad9 DNS (9.9.9.9):      $QUAD9_IP"

# Local DNS
LOCAL_IP=$(dig +short $DOMAIN | head -1)
echo "Local DNS:                $LOCAL_IP"

echo ""
echo "Status:"
if [ "$GOOGLE_IP" = "$EXPECTED_IP" ] || [ "$CLOUDFLARE_IP" = "$EXPECTED_IP" ] || [ "$LOCAL_IP" = "$EXPECTED_IP" ]; then
    echo "✅ DNS is propagating! Some servers show the correct IP."
else
    echo "⏳ DNS still propagating. Current IPs don't match expected IP."
    echo ""
    echo "This is normal! DNS changes can take:"
    echo "  - 5-15 minutes (if TTL was low)"
    echo "  - 1-24 hours (if TTL was high)"
    echo "  - Up to 48 hours (full global propagation)"
fi

echo ""
echo "💡 Tips:"
echo "  1. Check your DNS record at your registrar"
echo "  2. Make sure the A record points to: $EXPECTED_IP"
echo "  3. Lower the TTL to 300 (5 minutes) for faster updates"
echo "  4. Wait and check again in 15-30 minutes"


