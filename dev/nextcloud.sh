#!/bin/bash

set -e

rm -rf /tmp/server || true
# clone nextcloud server
git clone -b "${SERVER_BRANCH}" --depth 1 https://github.com/nextcloud/server.git /tmp/server

(cd /tmp/server && git submodule update --init)
rsync -a --chmod=755 --chown=www-data:www-data /tmp/server/ /var/www/html
chown www-data: -R /var/www/html/data
chown www-data: /var/www/html/.htaccess

# run the nextcloud setup
/usr/local/bin/bootstrap.sh apache2-foreground
