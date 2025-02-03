app_name=integration_openproject
app_version=$(version)
project_dir=.
build_dir=/tmp/build
sign_dir=/tmp/sign
cert_dir=$(HOME)/.nextcloud/certificates
webserveruser ?= www-data
occ_dir ?= /var/www/html/dev/server

build_tools_directory=$(CURDIR)/build/tools
npm=$(shell which npm 2> /dev/null)
composer=$(shell which composer 2> /dev/null)

#check for BEHAT_FILTER_TAGS env is set any
FILTER_TAGS := ~@skip
ifdef BEHAT_FILTER_TAGS
	FILTER_TAGS:=$(FILTER_TAGS)&&${BEHAT_FILTER_TAGS}
endif

all: build

.PHONY: build
build:
ifneq (,$(wildcard $(CURDIR)/composer.json))
	make composer
endif
ifneq (,$(wildcard $(CURDIR)/package.json))
	make npm
endif

.PHONY: dev
dev:
ifneq (,$(wildcard $(CURDIR)/composer.json))
	make composer
endif
ifneq (,$(wildcard $(CURDIR)/package.json))
	make npm-dev
endif

# Installs and updates the composer dependencies. If composer is not installed
# a copy is fetched from the web
.PHONY: composer
composer:
ifeq (, $(composer))
	@echo "No composer command available, downloading a copy from the web"
	mkdir -p $(build_tools_directory)
	curl -sS https://getcomposer.org/installer | php
	mv composer.phar $(build_tools_directory)
	php $(build_tools_directory)/composer.phar install --prefer-dist
else
	composer install --prefer-dist
endif

.PHONY: npm
npm:
	$(npm) ci
	$(npm) run build

.PHONY: npm-dev
npm-dev:
	$(npm) ci
	$(npm) run dev

.PHONY: psalm
psalm:
	composer run psalm

.PHONY: phpcs
phpcs:
	composer run cs:check

.PHONY: phpcs-fix
phpcs-fix:
	composer run cs:fix

.PHONY: lint-php
lint-php: psalm phpcs

.PHONY: lint-php-fix
lint-php-fix: psalm phpcs-fix

.PHONY: lint-js
lint-js:
	npm run lint
	npm run stylelint

.PHONY: lint-js-fix
lint-js-fix:
	npm run lint:fix
	npm run stylelint:fix

.PHONY: lint
lint: lint-php lint-js

.PHONY: lint-fix
lint-fix: lint-php-fix lint-js-fix

.PHONY: phpunit
phpunit:
	composer run test:unit

# The following make block can be removed once Nextcloud no longer supports PHP 8.0
.PHONY: phpunitforphp8.0
phpunitforphp8.0:
	composer run test:unit -- --exclude-group ignoreWithPHP8.0

.PHONY: jsunit
jsunit:
	npm run test:unit

.PHONY: api-test
api-test:
	composer run test:api -- --tags '${FILTER_TAGS}' ${FEATURE_PATH}

.PHONY: test
test: phpunit jsunit api-test

clean:
	sudo rm -rf $(build_dir)
	sudo rm -rf $(sign_dir)
	rm -rf node_modules
	rm -rf vendor

appstore: clean
	mkdir -p $(sign_dir)
	mkdir -p $(build_dir)
	@rsync -a \
	--exclude=.git \
	--exclude=appinfo/signature.json \
	--exclude=*.swp \
	--exclude=build \
	--exclude=.gitignore \
	--exclude=.travis.yml \
	--exclude=.scrutinizer.yml \
	--exclude=CONTRIBUTING.md \
	--exclude=composer.phar \
	--exclude=js/node_modules \
	--exclude=node_modules \
	--exclude=src \
	--exclude=translationfiles \
	--exclude=webpack.* \
	--exclude=stylelint.config.js \
	--exclude=.eslintrc.js \
	--exclude=.github \
	--exclude=.gitlab-ci.yml \
	--exclude=crowdin.yml \
	--exclude=tools \
	--exclude=.tx \
	--exclude=.l10nignore \
	--exclude=l10n/.tx \
	--exclude=l10n/l10n.pl \
	--exclude=l10n/templates \
	--exclude=l10n/*.sh \
	--exclude=l10n/[a-z][a-z] \
	--exclude=l10n/[a-z][a-z]_[A-Z][A-Z] \
	--exclude=l10n/no-php \
	--exclude=makefile \
	--exclude=screenshots \
	--exclude=phpunit*xml \
	--exclude=tests \
	--exclude=ci \
	--exclude=vendor/bin \
	$(project_dir) $(sign_dir)/$(app_name)
	@if [ -f $(cert_dir)/$(app_name).key ]; then \
		sudo chown $(webserveruser) $(sign_dir)/$(app_name)/appinfo ;\
		sudo -u $(webserveruser) php $(occ_dir)/occ integrity:sign-app --privateKey=$(cert_dir)/$(app_name).key --certificate=$(cert_dir)/$(app_name).crt --path=$(sign_dir)/$(app_name)/ ;\
		sudo chown -R $(USER) $(sign_dir)/$(app_name)/appinfo ;\
	else \
		echo "!!! WARNING signature key not found" ;\
	fi
	tar -czf $(build_dir)/$(app_name)-$(app_version).tar.gz \
		-C $(sign_dir) $(app_name)
	@if [ -f $(cert_dir)/$(app_name).key ]; then \
		echo NEXTCLOUD------------------------------------------ ;\
		openssl dgst -sha512 -sign $(cert_dir)/$(app_name).key $(build_dir)/$(app_name)-$(app_version).tar.gz | openssl base64 | tee $(build_dir)/sign.txt ;\
	fi
