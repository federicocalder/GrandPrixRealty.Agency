#!/bin/bash
# Script to update environment variables and properly reload containers
# Usage: ./update-env.sh [service-name]
# If no service specified, recreates all services

set -e

cd /root/GrandPrixRealty.Agency

if [ -n "$1" ]; then
    echo "Recreating $1 with updated environment..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate "$1"
else
    echo "Recreating all services with updated environment..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate
fi

echo "Done! Containers recreated with fresh environment variables."
