#!/bin/bash
# SPDX-FileCopyrightText: 2025 Jankari Tech Pvt. Ltd.
# SPDX-License-Identifier: AGPL-3.0-or-later

tmp_cert_dir="$HOME/tmp"

mkdir -p "$tmp_cert_dir"

tmp_cert="$tmp_cert_dir/root_ca.crt"

sudo rm -rf "$tmp_cert" /usr/local/share/ca-certificates/Step_Root_CA.crt /etc/ssl/certs/Step_Root_CA.pem

docker compose cp step:/home/step/certs/root_ca.crt "$tmp_cert"
sudo cp "$tmp_cert" /usr/local/share/ca-certificates/Step_Root_CA.crt
sudo update-ca-certificates

cert_db="$HOME/.pki/nssdb"
# delete existing cert
certutil -D -n "NC-OP Integration Root CA" -d sql:"$cert_db"
# add root CA to cert db
certutil -A -n "NC-OP Integration Root CA" -t TC -d sql:"$cert_db" -i "$tmp_cert"
# update/rebuild cert db
certutil -M -d sql:"$cert_db"
# list certs
certutil -L -d sql:"$cert_db"
