#!/bin/bash

set -e

STEP_CERTS_DIR="/step/certs"

if [ -d "$STEP_CERTS_DIR" ]; then
    rm -rf /etc/ssl/certs/Step_Root_CA.pem /usr/local/share/ca-certificates/Step_Root_CA.crt
    echo "[INFO] Linking root CA certificate..."
    cp "$STEP_CERTS_DIR"/root_ca.crt /usr/local/share/ca-certificates/Step_Root_CA.crt
    update-ca-certificates
fi

# install nextcloud
rm -rf /tmp/server || true
git clone -b "${SERVER_BRANCH}" --depth 1 https://github.com/nextcloud/server.git /tmp/server
(cd /tmp/server && git submodule update --init)
rsync -a --chmod=755 --chown=www-data:www-data /tmp/server/ /var/www/html
chown www-data: -R /var/www/html/data
chown www-data: /var/www/html/.htaccess

/usr/local/bin/bootstrap.sh apache2-foreground

# su www-data -c "php occ config:system:set allow_local_remote_servers --value 1"
# su www-data -c "php occ security:certificates:import /etc/ssl/certs/ca-certificates.crt"
