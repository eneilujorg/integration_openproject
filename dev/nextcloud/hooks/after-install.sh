#!/bin/bash

set -e

OCC() {
    # shellcheck disable=SC2068
    sudo -E -u www-data php "$WEBROOT/occ" $@
}

OCC a:e integration_openproject
OCC security:certificates:import /etc/ssl/certs/ca-certificates.crt
