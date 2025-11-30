#!/bin/bash
# Quick DNS verification script

DOMAIN="spokewheel.app"
EXPECTED_IP="178.42.255.55"

echo "🔍 Verifying DNS for $DOMAIN"
echo "Expected IP: $EXPECTED_IP"
echo ""

# Check from local DNS
LOCAL_IP=$(dig +short $DOMAIN | head -1)
echo "Local DNS result: $LOCAL_IP"

# Check from Google DNS
GOOGLE_IP=$(dig @8.8.8.8 +short $DOMAIN | head -1)
echo "Google DNS (8.8.8.8): $GOOGLE_IP"

# Check from Cloudflare DNS
CLOUDFLARE_IP=$(dig @1.1.1.1 +short $DOMAIN | head -1)
echo "Cloudflare DNS (1.1.1.1): $CLOUDFLARE_IP"

echo ""
if [ "$LOCAL_IP" = "$EXPECTED_IP" ] || [ "$GOOGLE_IP" = "$EXPECTED_IP" ] || [ "$CLOUDFLARE_IP" = "$EXPECTED_IP" ]; then
    echo "✅ SUCCESS! DNS is pointing to your server!"
    echo ""
    echo "Test your domain:"
    echo "  curl http://$DOMAIN"
    echo "  curl http://$DOMAIN/api/axes"
else
    echo "⏳ DNS not yet updated. Current IPs:"
    [ -n "$LOCAL_IP" ] && echo "  Local: $LOCAL_IP"
    [ -n "$GOOGLE_IP" ] && echo "  Google: $GOOGLE_IP"
    [ -n "$CLOUDFLARE_IP" ] && echo "  Cloudflare: $CLOUDFLARE_IP"
    echo ""
    echo "Please wait 2-5 minutes and run this script again."
fi


