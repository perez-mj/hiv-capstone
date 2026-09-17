#!/bin/bash
set -e

CHAIN_NAME="${BLOCKCHAIN_CHAIN:-patient_chain}"
RPC_PORT="${BLOCKCHAIN_RPC_PORT:-6821}"
RPC_USER="${BLOCKCHAIN_RPC_USER:-multichainrpc}"
RPC_PASSWORD="${BLOCKCHAIN_RPC_PASSWORD:-changeme}"
P2P_PORT="${BLOCKCHAIN_PORT:-6820}"

# Initialize the chain on first run
if [ ! -d "/root/.multichain/$CHAIN_NAME" ]; then
    echo "Initializing chain: $CHAIN_NAME"
    multichain-util create "$CHAIN_NAME"
    mkdir -p "/root/.multichain/$CHAIN_NAME"

    # Per-chain multichain.conf
    cat > "/root/.multichain/$CHAIN_NAME/multichain.conf" <<EOF
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcport=$RPC_PORT
rpcallowip=0.0.0.0/0
EOF

    # User-level multichain.conf
    cat > "/root/.multichain/multichain.conf" <<EOF
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcport=$RPC_PORT
rpcallowip=0.0.0.0/0
EOF
fi

# Run multichaind in the foreground so the container stays alive
exec multichaind "$CHAIN_NAME" \
    -datadir=/root/.multichain \
    -port="$P2P_PORT" \
    -printtoconsole \
    -daemon=0