#!/bin/bash
set -e

# [HELP]
# Available envs:
# - NEXTCLOUD_VERSIONS          space separated list of nextcloud versions (e.g. "30 31 master")
#                               NOTE:
#                                   - Provide only the major version for stable releases (e.g. "31")
#                                   - You can also provide any NC server branch (e.g. "master")
# - PHP_VERSIONS                space separated list of php versions (e.g. "8.1 8.2")
#                               NOTE:
#                                   - Provide at least major and minor version in the format: <major>.<minor>
# - DEFAULT_PHP_VERSION         default php version (e.g. "8.2")
# - DEFAULT_DATABASE            default database (e.g. "mysql")
# - EXTRA_DATABASES             space separated list of extra databases (e.g. "postgres")
# - LATEST_STABLE_NC_VERSION    latest stable nextcloud version (e.g. "31")

nextcloudVersions=$NEXTCLOUD_VERSIONS
phpVersions=$PHP_VERSIONS
extraDatabases=$EXTRA_DATABASES

if [ -z "$NEXTCLOUD_VERSIONS" ]; then
    echo "Missing nextcloud versions. Provide space separated list using 'NEXTCLOUD_VERSIONS' env."
    exit 1
fi
if [ -z "$PHP_VERSIONS" ]; then
    echo "Missing php versions. Provide space separated list using 'PHP_VERSIONS' env."
    exit 1
fi

function getPhpMajorVersion() {
    echo "$1" | cut -d'.' -f1
}

function getPhpMinorVersion() {
    echo "$1" | cut -d'.' -f2
}

function checkPHPVersionFormat() {
    local phpVersion="$1"
    if ! [[ "$phpVersion" =~ ^[0-9]+\.[0-9]+ ]]; then
        echo "[ERR] Invalid PHP version: '$phpVersion'. Provide at least major and minor version: <major>.<minor>"
        exit 1
    fi
}

function parsePHPVersion() {
    local phpVersion="$1"
    local phpVersionMajor
    local phpVersionMinor
    phpVersionMajor=$(getPhpMajorVersion "$phpVersion")
    phpVersionMinor=$(getPhpMinorVersion "$phpVersion")
    echo "$phpVersionMajor.$phpVersionMinor"
}

# Default values
defaultPhpVersion="8.2"
if [ -n "$DEFAULT_PHP_VERSION" ]; then
    checkPHPVersionFormat "$DEFAULT_PHP_VERSION"
    defaultPhpVersion=$(parsePHPVersion "$DEFAULT_PHP_VERSION")
fi
defaultPhpMajorVersion=$(getPhpMajorVersion "$defaultPhpVersion")
defaultPhpMinorVersion=$(getPhpMinorVersion "$defaultPhpVersion")
defaultDatabase="mysql"
if [ -n "$DEFAULT_DATABASE" ]; then
    defaultDatabase="$DEFAULT_DATABASE"
fi

latestStableNCVersion=""
if [ -n "$LATEST_STABLE_NC_VERSION" ]; then
    latestStableNCVersion="$LATEST_STABLE_NC_VERSION"
    # add stable branch prefix for stable versions
    # e.g. 30 -> stable30
    if [[ "$latestStableNCVersion" =~ ^[0-9]+$ ]]; then
        latestStableNCVersion="stable$latestStableNCVersion"
    fi
else
    # determine latest stable version from the list
    # this only takes into account the major version number and stable branches
    # e.g. 30, stable30
    for ncVersion in $nextcloudVersions; do
        # parse the major version number from stable branch
        # e.g. stable30 -> 30
        if [[ "$ncVersion" =~ ^stable[0-9]+$ ]]; then
            ncVersion=${ncVersion//stable/}
        fi
        if ! [[ "$ncVersion" =~ ^[0-9]+$ ]]; then
            continue
        fi
        if [ -z "$latestStableNCVersion" ]; then
            latestStableNCVersion=$ncVersion
            continue
        fi
        if [ "$ncVersion" -gt "$latestStableNCVersion" ]; then
            latestStableNCVersion=$ncVersion
        fi
    done
    latestStableNCVersion="stable$latestStableNCVersion"
fi

MATRIX=""
function addMatrix() {
    local nextcloudVersion=$1
    local phpVersion=$2
    local phpVersionMajor=$3
    local phpVersionMinor=$4
    local database=$5
    MATRIX="$MATRIX{\"nextcloudVersion\": \"$nextcloudVersion\", \"phpVersion\": \"$phpVersion\", \"phpVersionMajor\": \"$phpVersionMajor\", \"phpVersionMinor\": \"$phpVersionMinor\", \"database\": \"$database\"},"
}

# [NOTE]
# This generates single job for the older nextcloud version
#   with corresponding php version and mysql database.
# And generates all combination for the latest stable nextcloud version
#   with all php versions and mysql database
# Example:
#    nextcloudVersions="30 31 master" and phpVersions="8.1 8.2"
#  Generates:
#    - 30 8.2 mysql
#    - 31 8.1 mysql
#    - 31 8.2 mysql
#    - master 8.3 mysql
for ncVersion in $nextcloudVersions; do
    # add stable branch prefix for stable versions
    # e.g. 30 -> stable30
    if [[ "$ncVersion" =~ ^[0-9]+$ ]]; then
        ncVersion="stable$ncVersion"
    fi

    # [INFO] Run all combination for the latest stable NC version
    if [ "$ncVersion" = "$latestStableNCVersion" ]; then
        for phpVersion in $phpVersions; do
            checkPHPVersionFormat "$phpVersion"
            phpVersion=$(parsePHPVersion "$phpVersion")
            phpVersionMajor=$(getPhpMajorVersion "$phpVersion")
            phpVersionMinor=$(getPhpMinorVersion "$phpVersion")
            addMatrix "$ncVersion" "$phpVersion" "$phpVersionMajor" "$phpVersionMinor" "$defaultDatabase"
        done
        continue
    fi

    phpVersion=""
    phpVersionMajor=""
    phpVersionMinor=""

    # [INFO] Run only one job for older versions and master branch
    if [ "$ncVersion" = "stable27" ]; then
        phpVersion="8.0"
    elif [ "$ncVersion" = "stable28" ]; then
        phpVersion="8.1"
    elif [ "$ncVersion" = "stable29" ]; then
        phpVersion="8.1"
    elif [ "$ncVersion" = "stable30" ]; then
        phpVersion="8.2"
    elif [ "$ncVersion" = "master" ]; then
        phpVersion="8.3"
    else
        phpVersion="$defaultPhpVersion"
    fi

    if [ -n "$phpVersion" ]; then
        phpVersionMajor=$(getPhpMajorVersion "$phpVersion")
        phpVersionMinor=$(getPhpMinorVersion "$phpVersion")
        addMatrix "$ncVersion" "$phpVersion" "$phpVersionMajor" "$phpVersionMinor" "$defaultDatabase"
    fi
done

# add extra db matrix
# matrix for extra databases will use default php version and latest supported NC version
for extraDatabase in $extraDatabases; do
    if [ "$extraDatabase" = "$defaultDatabase" ]; then
        continue
    fi
    addMatrix "$latestStableNCVersion" "$defaultPhpVersion" "$defaultPhpMajorVersion" "$defaultPhpMinorVersion" "$extraDatabase"
done

# remove last comma
MATRIX=${MATRIX%?}
echo "$MATRIX"
