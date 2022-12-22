#!/usr/bin/env bash

# This bash script is to set up the whole `openproject_integration` app integration
# To run this script `nextcloud` and `openproject` instance must be running

# variables from environment
# NEXTCLOUD_HOST=<nextcloud_host_url>
# OPENPROJECT_HOST=<openproject_host_url>
# PATH_TO_NEXTCLOUD=<path to nextcloud in your local machine>

log_error() {
	echo -e "\e[31m$1\e[0m"
}

log_info() {
	echo -e "\e[37m$1\e[0m"
}

log_success() {
	echo -e "\e[32m$1\e[0m"
}

# This urls is are just to check if the nextcloud and openproject has been started or not before running the script
NEXTCLOUD_HOST_STATE=$(curl -s -X GET ${NEXTCLOUD_HOST}/cron.php)
OPENPROJECT_HOST_STATE=$(curl -s -X GET ${OPENPROJECT_HOST}/api/v3/configuration | jq -r "._type")
OPENPROJECT_BASEURL_FOR_STORAGE=${OPENPROJECT_HOST}/api/v3/storages
INTEGRATION_URL_FOR_SETUP=${NEXTCLOUD_HOST}/index.php/apps/integration_openproject/setup

# check if both instance are started or not
if [[ ${OPENPROJECT_HOST_STATE} != "Configuration" ]]
then
	log_error "Open Project Host has not been started !!"
	exit 1
elif [[ "$NEXTCLOUD_HOST_STATE" != *"success"* ]]
 then
	log_error "Nextcloud Host has not been started !!"
	 exit 1
fi

# making sure that jq is installed
if ! command -v jq &> /dev/null
then
	log_error "jq is not installed"
	log_info "sudo apt install -y jq"
    exit 1
fi

# api call to get openproject_client_id and openproject_client_secret
CREATE_STORAGE_RESPONSE=$(curl -s -X POST -uapiadmin:apiadmin \
                            ${OPENPROJECT_BASEURL_FOR_STORAGE} \
                            -H 'accept: application/hal+json' \
                            -H 'Content-Type: application/json' \
                            -H 'X-Requested-With: XMLHttpRequest' \
                            -d '{
                            "name": "Nextcloud",
                            "_links": {
                              "origin": {
                                "href": "'${NEXTCLOUD_HOST}'"
                              },
                              "type": {
                                "href": "urn:openproject-org:api:v3:storages:Nextcloud"
                              }
                            }
                          }')

response_type=$(echo $CREATE_STORAGE_RESPONSE | jq -r "._type")
if [[ ${response_type} == "Error" ]]; then
	error_message=$(echo $CREATE_STORAGE_RESPONSE | jq -r ".message")
	if [[ ${error_message} == "Multiple field constraints have been violated." ]]; then
		violated_error_messages=$(echo $CREATE_STORAGE_RESPONSE | jq -r "._embedded.errors[].message")
		log_error "${violated_error_messages}"
		log_info "Try deleting the file storage in openproject and integrate again !!"
   		exit 1
    elif [[ ${error_message} == "You did not provide the correct credentials." ]]; then
    	log_error "Unauthorized !!! Try running Open Project with environment variable below"
        log_info "OPENPROJECT_AUTHENTICATION_GLOBAL__BASIC__AUTH_USER=<global_admin_username>  OPENPROJECT_AUTHENTICATION_GLOBAL__BASIC__AUTH_PASSWORD=<global_admin_password>  foreman start -f Procfile.dev"
       	exit 1
    fi
    log_error "${error_message}"
    log_info "Try deleting the file storage in openproject and integrate again !!"
   exit 1
fi

# required information from the above response
storage_id=$(echo $CREATE_STORAGE_RESPONSE | jq -e '.id')
openproject_client_id=$(echo $CREATE_STORAGE_RESPONSE | jq -e '._embedded.oauthApplication.clientId')
openproject_client_secret=$(echo $CREATE_STORAGE_RESPONSE | jq -e '._embedded.oauthApplication.clientSecret')

if [ ${storage_id} == null ] || [ ${openproject_client_id} == null ] || [ ${openproject_client_secret} == null ]; then
  log_error "Response does not contain (storage_id or openproject_client_id or openproject_client_secret)"
  exit 1
fi


# api call to set the  openproject_client_id and openproject_client_secret to nextcloud and also get nextcloud_client_id and nextcloud_client_secret
NEXTCLOUD_INFORMATION_RESPONSE=$(curl -s -XPOST -uadmin:admin ${INTEGRATION_URL_FOR_SETUP} \
						   -d '{
						   "values":{
								   "openproject_instance_url":"'${OPENPROJECT_HOST}'",
								   "openproject_client_id":'${openproject_client_id}',
								   "openproject_client_secret":'${openproject_client_secret}',
								   "default_enable_navigation":false,
								   "default_enable_unified_search":false
								   }
						   }' \
						   -H 'Content-Type: application/json')
# # required information from the above response
nextcloud_client_id=$(echo $NEXTCLOUD_INFORMATION_RESPONSE | jq -e ".nextcloud_client_id")
nextcloud_client_secret=$(echo $NEXTCLOUD_INFORMATION_RESPONSE | jq -e ".nextcloud_client_secret")

if [ ${nextcloud_client_id} == null ] || [ ${nextcloud_client_secret} == null ]; then
  log_error "Response does not contain (nextcloud_client_id or nextcloud_client_secret)"
  exit 1
fi

# api call to set the nextcloud_client_id and nextcloud_client_secret to openproject files storage
SET_NC_TO_STORAGE_RESPONSE=$(curl -s -X POST -uapiadmin:apiadmin \
                                  ${OPENPROJECT_BASEURL_FOR_STORAGE}/${storage_id}/oauth_client_credentials \
                                  -H 'accept: application/hal+json' \
                                  -H 'Content-Type: application/json' \
                                  -H 'X-Requested-With: XMLHttpRequest' \
                                  -d '{
                                  "clientId": '${nextcloud_client_id}',
                                  "clientSecret": '${nextcloud_client_secret}'
                                  }')

# if there is no error from the last api call then the integration can be declared successful

response_type=$(echo $SET_NC_TO_STORAGE_RESPONSE | jq -r "._type")
if [ ${nextcloud_client_id} == "Error" ]; then
  error_message=$(echo $SET_NC_TO_STORAGE_RESPONSE | jq -r ".message")
  log_error "${error_message}"
  exit 1
else
	log_success "Integration Successful :) !!"
fi
