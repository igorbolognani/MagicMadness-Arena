# MagicMadness Arena — Architecture Notes

The authoritative architecture is in
docs/canonical/13_TECHNICAL_ARCHITECTURE.md and
docs/canonical/14_DATA_MODEL_AND_CONTRACTS.md.

The current repository keeps four runtime boundaries:

1. web client and local bot simulation;
2. authoritative realtime game server;
3. persistence/API service;
4. shared data-driven game packages.

The web client may be hosted on ChatGPT Sites when the generated deployment
supports the static/frontend requirements. Realtime authority and persistence
remain independently deployable.
