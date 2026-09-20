#!/usr/bin/env bash
# Safe nginx route snippet install — one file only; never edits main nginx.conf or other routes.

nginx_run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "ERROR: need root or sudo to write nginx route snippets." >&2
    return 1
  fi
}

# install_nginx_route_snippet <route_file> <temp_file> [skip_reload: 0|1]
# Writes a single snippet under /etc/nginx/routes/ (or custom dir).
# Does not modify nginx.conf, sites-available/enabled, or sibling route files.
install_nginx_route_snippet() {
  local route_file="$1"
  local temp_file="$2"
  local skip_reload="${3:-0}"
  local routes_dir
  routes_dir="$(dirname "${route_file}")"
  local route_name
  route_name="$(basename "${route_file}")"

  echo ""
  echo "====================================================="
  echo "Safe nginx route install (additive only)"
  echo "  Writes:    ${route_file}"
  echo "  Unchanged: nginx.conf, sites-available/, sites-enabled/"
  echo "  Unchanged: other files in ${routes_dir}/"
  echo "====================================================="
  echo ""

  nginx_run_root mkdir -p "${routes_dir}" || return 1

  if [[ -f "${route_file}" ]]; then
    local backup="${route_file}.bak.$(date +%Y%m%d%H%M%S)"
    echo "Backing up previous ${route_name} → $(basename "${backup}")"
    nginx_run_root cp -a "${route_file}" "${backup}"
  fi

  nginx_run_root cp "${temp_file}" "${route_file}"
  nginx_run_root chmod 644 "${route_file}"
  echo "Wrote ${route_file}"

  if [[ "${skip_reload}" -eq 1 ]]; then
    echo "Skip reload requested; run: sudo nginx -t && sudo systemctl reload nginx"
    return 0
  fi

  if ! command -v nginx >/dev/null 2>&1; then
    echo "WARN: nginx binary not found; snippet written but not validated." >&2
    return 0
  fi

  echo ""
  echo "Validating full nginx configuration (all existing routes preserved)..."
  if nginx_run_root nginx -t; then
    echo "Reloading nginx (graceful — existing connections kept)..."
    if nginx_run_root systemctl reload nginx 2>/dev/null; then
      :
    elif nginx_run_root service nginx reload 2>/dev/null; then
      :
    else
      echo "WARN: could not reload nginx (run manually)." >&2
    fi
    return 0
  fi

  echo "ERROR: nginx -t failed; restoring previous ${route_name} if backed up." >&2
  local latest_backup
  latest_backup="$(nginx_run_root ls -t "${route_file}.bak."* 2>/dev/null | head -1 || true)"
  if [[ -n "${latest_backup}" ]]; then
    nginx_run_root cp -a "${latest_backup}" "${route_file}" || true
    nginx_run_root nginx -t && nginx_run_root systemctl reload nginx 2>/dev/null || true
  fi
  return 1
}
