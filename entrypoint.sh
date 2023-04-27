#!/bin/bash

export VITE_UDP_HOST=$(dig +short realaf.fly.dev)

exec "$@"
