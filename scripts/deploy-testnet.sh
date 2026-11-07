#!/usr/bin/env bash
# Build and deploy LOOPTAG to Stellar testnet, then run first-time setup.
#
# Prerequisites:
#   - stellar CLI 27+
#   - a funded testnet identity (ADMIN) and a return-station identity (STATION)
#
# Example:
#   STELLAR_CONFIG_DIR=$HOME/.config/stellar ADMIN=admin STATION=station \
#   ./scripts/deploy-testnet.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="${NETWORK:-testnet}"
MERCHANT_NAME="${MERCHANT_NAME:-Circular Cafe}"
ALIAS="${ALIAS:-looptag}"

ADMIN="${ADMIN:?set ADMIN to the funded deployer identity name}"
STATION="${STATION:?set STATION to the return-station identity name}"

STELLAR=(stellar)
if [[ -n "${STELLAR_CONFIG_DIR:-}" ]]; then
  STELLAR+=(--config-dir "${STELLAR_CONFIG_DIR}")
fi

address() {
  "${STELLAR[@]}" keys address "$1"
}

echo "building contract"
(cd "${ROOT}/contracts" && "${STELLAR[@]}" contract build)

WASM="${ROOT}/contracts/target/wasm32v1-none/release/looptag.wasm"
if [[ ! -f "${WASM}" ]]; then
  echo "wasm not found at ${WASM}" >&2
  exit 1
fi

echo "deploying to ${NETWORK}"
CONTRACT_ID="$("${STELLAR[@]}" contract deploy \
  --wasm "${WASM}" \
  --source-account "${ADMIN}" \
  --network "${NETWORK}" \
  --alias "${ALIAS}" | tail -n 1)"
echo "contract id: ${CONTRACT_ID}"

ADMIN_ADDRESS="$(address "${ADMIN}")"
STATION_ADDRESS="$(address "${STATION}")"
XLM_SAC="$("${STELLAR[@]}" contract id asset --asset native --network "${NETWORK}")"

invoke_as() {
  local source="$1"
  shift
  "${STELLAR[@]}" contract invoke \
    --id "${CONTRACT_ID}" \
    --source-account "${source}" \
    --network "${NETWORK}" \
    -- "$@"
}

echo "initializing"
invoke_as "${ADMIN}" initialize --admin "${ADMIN_ADDRESS}" --deposit_token "${XLM_SAC}"

echo "registering merchant"
invoke_as "${ADMIN}" register_merchant --merchant "${ADMIN_ADDRESS}" --name "${MERCHANT_NAME}"

echo "registering return station"
invoke_as "${ADMIN}" register_station --issuer "${ADMIN_ADDRESS}" --station "${STATION_ADDRESS}"

cat <<EOF

Deployment complete.

  contract id : ${CONTRACT_ID}
  deposit     : ${XLM_SAC} (native XLM SAC)
  admin       : ${ADMIN_ADDRESS}
  station     : ${STATION_ADDRESS}

Next:
  1. Run ./scripts/demo-testnet.sh to issue, transfer, return and redeem a claim.
  2. Update deployments/testnet.json with the new contract id and transaction hashes.
EOF
