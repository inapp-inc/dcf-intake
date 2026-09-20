#!/bin/sh
set -eu

APP_BASE_PATH="${APP_BASE_PATH:-/intake}"
APP_BASE_PATH="${APP_BASE_PATH%/}"

if [ -z "${APP_BASE_PATH}" ] || [ "${APP_BASE_PATH}" = "/" ]; then
  APP_BASE_PATH=""
fi

if [ "${BEHIND_REVERSE_PROXY:-0}" = "1" ]; then
  TEMPLATE="/etc/nginx/nginx.conf.http-only.template"
else
  TEMPLATE="/etc/nginx/nginx.conf.template"
fi

if [ -n "${APP_BASE_PATH}" ]; then
  sed "s|__APP_BASE__|${APP_BASE_PATH}|g" "${TEMPLATE}" > /etc/nginx/nginx.conf
else
  sed '/location = __APP_BASE__/d' "${TEMPLATE}" \
    | sed 's|__APP_BASE__||g' > /etc/nginx/nginx.conf
fi

exec nginx -g 'daemon off;'
