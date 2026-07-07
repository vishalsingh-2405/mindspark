# Word Vault data pipeline

Build-time pipeline that generates the tiered vocabulary shards committed at
`public/data/vocab/{everyday,intermediate,advanced}.json`. The shards are
committed so the repo stays clone-and-run; regenerate only when changing the
pipeline or upgrading a data source.

## Regenerating

```bash
npm run build:vocab
```

The first run downloads the ~50 MB frequency list to `data-pipeline/cache/`
(gitignored); subsequent runs reuse the cache. Delete the cache file to force a
fresh download. WordNet data comes from the installed `wordnet-db` package, so
no other network access is needed.

## How it works

1. Words are taken in descending frequency order from the frequency list,
   deduplicated.
2. Each word must be clean (lowercase alphabetic, 3–14 chars — this drops
   multiword lemmas, punctuation, and proper nouns), absent from the profanity
   blocklist, and have a WordNet definition. WordNet lemmas are matched
   case-sensitively, so capitalized proper-noun senses (Paris, John) never
   supply definitions.
3. The first 15,000 accepted words are tiered by acceptance rank:

   | Tier         | Rank range      | Count |
   | ------------ | --------------- | ----- |
   | everyday     | 0 – 2,999       | 3,000 |
   | intermediate | 3,000 – 7,999   | 5,000 |
   | advanced     | 8,000 – 14,999  | 7,000 |

   Thresholds live in `data-pipeline/lib.mjs` (`tierForRank`: 3000 / 8000 /
   15000).

Each shard entry is `{ id, word, pos, meaning, example }`; `example` may be an
empty string (the UI hides the row — see docs/superpowers decision log).

## Data sources and licenses

- **WordNet 3.1** — Princeton University, via the
  [`wordnet-db`](https://www.npmjs.com/package/wordnet-db) npm package
  (the package ships the WordNet 3.1 database files). Permissive license
  requiring attribution:

  > This software and database is being provided to you, the LICENSEE, by
  > Princeton University under the following license. By obtaining, using
  > and/or copying this software and database, you agree that you have read,
  > understood, and will comply with these terms and conditions.
  >
  > Princeton University "About WordNet." WordNet. Princeton University. 2010.
  > <https://wordnet.princeton.edu/>

  WordNet supplies part of speech, definition (gloss meaning), and example
  sentences.

- **[hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)**
  — MIT license. English full frequency list derived from the
  [OpenSubtitles](https://www.opensubtitles.org/) 2018 corpus
  (`content/2018/en/en_full.txt`). Supplies word frequency ranking.

- **[naughty-words](https://www.npmjs.com/package/naughty-words)** — the
  LDNOOBW list (List of Dirty, Naughty, Obscene, and Otherwise Bad Words),
  CC-BY 4.0. English list used as the profanity blocklist.
