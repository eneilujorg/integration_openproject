#!/bin/bash

set -e

echo "-----------------------------------------------------------"
echo "[INFO] Installing CA certificates..."
echo "-----------------------------------------------------------"

STEP_CERTS_DIR="/step/certs"

if [ -d "$STEP_CERTS_DIR" ]; then
    rm -rf /etc/ssl/certs/Step_Root_CA.pem /usr/local/share/ca-certificates/Step_Root_CA.crt
    echo "[INFO] Linking root CA certificate..."
    cp "$STEP_CERTS_DIR"/root_ca.crt /usr/local/share/ca-certificates/Step_Root_CA.crt
    update-ca-certificates
fi

# fix custom_apps permissions
chown www-data custom_apps
find ./custom_apps -mindepth 1 -path ./custom_apps/integration_openproject -prune -o -exec chown www-data {} \;
