# Reference archive

This folder contains the original PLU WordPress exports and supporting files, prior visual design notes, screenshots, and the superseded Vite entry point and README. Original export filenames and relative asset paths were preserved by moving each export and its matching `_files` directory together.

`public/brand/` at the project root contains the assets actually consumed by the Next.js application. This archive is not a public route or build input. `build-artifacts/` and `doc/preview/` are local-only generated evidence and are ignored by Git.

The archived migration script records a one-time transformation and must not be rerun against the migrated app. The archived Next.js agent guidance was generated during the migration; automatic root guidance generation is disabled to keep the root focused on the app.
