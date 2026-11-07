#!/usr/bin/env bash
# Reproduce the LOOPTAG lifecycle against Stellar testnet.
#
# Prerequisites:
#   - stellar CLI 27+
#   - funded testnet identities named by ADMIN, ALICE, BOB and STATION
#
# Example:
#   STELLAR_CONFIG_DIR=$HOME/.config/stellar \
#   ADMIN=admin ALICE=alice BOB=bob STATION=station \
#   ./scripts/demo-testnet.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="${NETWORK:-testnet}"
CONTRACT_ID="${CONTRACT_ID:-$(node -p "require('${ROOT}/deployments/testnet.json').contractId")}"
SERIAL="${SERIAL:-CUP-042}"
DEPOSIT="${DEPOSIT:-20000000}"
EXPIRES_AT="${EXPIRES_AT:-0}"

ADMIN="${ADMIN:?set ADMIN to the funded issuer identity name}"
ALICE="${ALICE:?set ALICE to the first customer identity name}"
BOB="${BOB:?set BOB to the second customer identity name}"
STATION="${STATION:?set STATION to the return-station identity name}"

STELLAR=(stellar)
if [[ -n "${STELLAR_CONFIG_DIR:-}" ]]; then
  STELLAR+=(--config-dir "${STELLAR_CONFIG_DIR}")
fi

invoke_as() {
  local source="$1"
  shift
  "${STELLAR[@]}" contract invoke \
    --id "${CONTRACT_ID}" \
    --source-account "${source}" \
    --network "${NETWORK}" \
    -- "$@"
}

address() {
  "${STELLAR[@]}" keys address "$1"
}

ADMIN_ADDRESS="$(address "${ADMIN}")"
ALICE_ADDRESS="$(address "${ALICE}")"
BOB_ADDRESS="$(address "${BOB}")"
STATION_ADDRESS="$(address "${STATION}")"
SERIAL_HASH="$(printf '%s' "${SERIAL}" | sha256sum | cut -d' ' -f1)"

echo "LOOPTAG testnet demo"
echo "  contract : ${CONTRACT_ID}"
echo "  serial   : ${SERIAL} (${SERIAL_HASH})"
echo "  deposit  : ${DEPOSIT} stroops"
echo "  issuer   : ${ADMIN_ADDRESS}"
echo "  alice    : ${ALICE_ADDRESS}"
echo "  bob      : ${BOB_ADDRESS}"
echo "  station  : ${STATION_ADDRESS}"
echo

echo "1/5 register merchant"
invoke_as "${ADMIN}" register_merchant --merchant "${ADMIN_ADDRESS}" --name "Circular Cafe"

echo "2/5 register return station"
invoke_as "${ADMIN}" register_station --issuer "${ADMIN_ADDRESS}" --station "${STATION_ADDRESS}"

echo "3/5 issue deposit-backed claim to Alice"
CLAIM_ID="$(invoke_as "${ADMIN}" issue_claim \
  --issuer "${ADMIN_ADDRESS}" \
  --owner "${ALICE_ADDRESS}" \
  --serial_hash "${SERIAL_HASH}" \
  --deposit "${DEPOSIT}" \
  --expires_at "${EXPIRES_AT}" | tail -n 1)"
echo "    claim id: ${CLAIM_ID}"

echo "4/5 transfer claim from Alice to Bob"
invoke_as "${ALICE}" transfer_claim \
  --claim_id "${CLAIM_ID}" \
  --from "${ALICE_ADDRESS}" \
  --to "${BOB_ADDRESS}"

echo "5/5 station attests return, then redeem to Bob"
invoke_as "${STATION}" authorize_return \
  --claim_id "${CLAIM_ID}" \
  --station "${STATION_ADDRESS}" \
  --serial_hash "${SERIAL_HASH}"
# Redemption is permissionless. The contract pays the current owner (Bob).
invoke_as "${ADMIN}" redeem --claim_id "${CLAIM_ID}"

echo
echo "final claim:"
invoke_as "${ADMIN}" get_claim --claim_id "${CLAIM_ID}"
echo "final merchant liability:"
invoke_as "${ADMIN}" get_outstanding_liability --issuer "${ADMIN_ADDRESS}"
