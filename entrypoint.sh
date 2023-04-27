#!/bin/bash

export VITE_UDP_HOST="$(dig +short realaf.fly.dev):3000"

exec "$@"
