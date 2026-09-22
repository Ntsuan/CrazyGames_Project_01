# Repository collaboration

Read agent.md, PROJECT_HANDOFF.md, RELEASE_CHANNELS.md and 交接文档.md before changing this repository.

Current game: game/index.html (Neon Hunter). src/ and the Phaser environment are historical.

The active local authoring directory is /Users/zmy/WorkBuddy/CrazyGames; this repository is its Git sync checkout. Check for newer changes before synchronizing either way. Never overwrite unrelated local work.

Keep codex/develop in development profile and main in basic profile. Profile configuration, release builds and promotion commands are documented in RELEASE_CHANNELS.md. Do not enable Full packaging until SDK integration and platform validation are complete. Never force-push or erase branch history for routine releases.

After behavior changes, increment the game version and update CHANGELOG, the matching HTML snapshot and handoff. Record author Codex, verification, outstanding work and rollback location. Run npm run neon:check, the matching package build and package checks. Known regression C75 must remain explicitly reported, not counted as passing.

Do not publish editor caches, personal tool state, test logs or secrets. GitHub source pushes and build artifacts are not a CrazyGames launch.
