# Build session artifacts

This branch holds the AI build session for the make.fun entry
[Octavia's Tidepool Kitchen](https://github.com/Poorya0128/octavias-tidepool-kitchen/tree/main).
It is kept on a separate branch so the entry's `main` snapshot stays clean.

- **`kiro-session.jsonl`** — the raw session transcript recorded by the Kiro agent that wrote
  the game (one JSON object per line).
- **`octavias-tidepool-kitchen.tar.gz`** — a full archive of the project at the pushed commit.

## Note on submitting to make.fun

This is a raw transcript and a plain archive, **not** an official make.fun transcript bundle.
A submittable bundle is produced by the kit on your own machine, which also adds the run record
and redacts personal details:

```sh
node cli/makefun.mjs bundle --repo . --system-prompt <file> --effort <level> --out transcripts.tar.gz
# if it reports no session found, point it at the transcript:
node cli/makefun.mjs bundle --session kiro-session.jsonl --repo . --out transcripts.tar.gz
```

Run `node cli/makefun.mjs bundle --dry-run ...` first to confirm the kit can read this log format.
