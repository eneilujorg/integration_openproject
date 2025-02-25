#!/bin/bash

set -e

# fix custom_apps permissions
chown www-data custom_apps
find ./custom_apps -mindepth 1 -path ./custom_apps/integration_openproject -prune -o -exec chown www-data {} \;

OCC() {
    # shellcheck disable=SC2068
    sudo -E -u www-data php "$WEBROOT/occ" $@
}

OCC a:e integration_openproject
OCC security:certificates:import /etc/ssl/certs/ca-certificates.crt
