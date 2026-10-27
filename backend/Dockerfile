FROM php:8.4-fpm-bookworm

# Limit compilation parallelism: small VPS instances can report more CPUs than
# they have available RAM, and `-j$(nproc)` can OOM during concurrent builds.
ARG PHP_EXT_BUILD_JOBS=2
ARG DEBIAN_FRONTEND=noninteractive

# Install system dependencies with retries. Keep this separate from extension
# compilation so a failed build clearly identifies network/package vs compile issues.
RUN set -eux; \
    apt-get -o Acquire::Retries=3 \
            -o Acquire::http::Timeout=30 \
            -o Acquire::https::Timeout=30 \
            update; \
    apt-get -o Acquire::Retries=3 \
        -o Acquire::http::Timeout=30 \
        -o Acquire::https::Timeout=30 \
        install -y --no-install-recommends \
        git unzip curl \
        libpq-dev libzip-dev libpng-dev libjpeg62-turbo-dev \
        libfreetype6-dev libicu-dev libonig-dev libxml2-dev; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"${PHP_EXT_BUILD_JOBS}" \
        pdo_mysql pdo_pgsql bcmath gd intl pcntl zip opcache mbstring dom xml xmlwriter

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY composer.json ./composer.json
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts
COPY . .
RUN composer dump-autoload --no-dev --optimize \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app/private bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr
EXPOSE 9000
CMD ["php-fpm", "-F"]
