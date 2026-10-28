#!/bin/sh
# Pokreće Feniks π (živa pozadina + ikona u traci). Dodaj --aplikacija da se odmah otvori i prozor aplikacije.
cd "$(dirname "$0")" && PATH="$HOME/.local/opt/node/bin:$PATH" exec npx electron . "$@"
