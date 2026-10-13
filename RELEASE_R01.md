# S13 Production release R01

Assignment: `JH-MASKED-SINGER-S13-PRODUCTION-20261013-R01`, version 1.
Status: local candidate verified; Production switch pending authenticated Vercel access.

## Exact source and integration

Approved local source: `feature/s13-simple` at `14ccd80efcb3df69d3cb79909665fcc55583e723`.
Fresh local HEAD/log and Project Core record `recrrAvioKbfB0ZFs` match that source;
no newer local application change was found. The only existing unstaged change is
a historical scope correction in `LOCAL_PREVIEW.md`; it remains untouched in the
original working directory. Human acceptance is reported by the live handoff and
Project Core, not claimed as a new Codex hardware acceptance.

Release branch `release/s13-production-20261013` integrates that exact source with
main `2cc6f7f37e054a5a7b080bf72e8c95ff3311c687`. The one PromiCheckView conflict is
resolved to the reviewed shared CatalogBrowser version, which already contains
the same S12 helper. Before adding this release note, the entire staged tree was
identical to the approved feature tree. No new application behavior is added.

## Verified source backups

GitHub tags, normal push and fresh exact remote readback:

- `backup/production-df1592c-20261013` -> `df1592c09206a84e7138a54757cba5c8829584da`
- `backup/main-2cc6f7f-20261013` -> `2cc6f7f37e054a5a7b080bf72e8c95ff3311c687`

Private complete-history Git bundle containing both refs and the approved source:
`H:/CODEX/JARVIS_MARK_TWO/_workshop/masked-singer-release-r01-private/source-backup.bundle`.
`git bundle verify` passed. This backs up source, not browser IndexedDB.

## Verification

Typecheck, all104 tests and build pass. Build `index-C4OLWXY_.js` has SHA256
`c714c61c7d24c2952b5e8fe06779ebf85d12e0d88b781b58bb84fb35d1a6753d`,
identical to the previously reviewed local runtime. The existing nonfatal501kB
chunk warning remains; no dependency or architecture change is made.

Isolated Chromium tests pass: real repaired import/preview/cancel/explicit
activation41/21/0/export/import/reload; Show4/5/6 and20/18/16 bases; six semifinal
badges and closed independent explanations; Promi-Check drafts/Final/name matching
at390/1024/1440px; all9 S12 costumes plus9 portraits in Home/global/tip views,
with seasons1-11/13 sampled. No state uploads or captured page errors.

Same-origin old -> new -> old code switch passes on a private archived CLASSIC
copy: state and exports identical, zero startup writes, CLASSIC35/17/0 retained,
no automatic S13 activation. Separate explicit activation tests produce41/21/0.
Storage/schema code is unchanged from main. Original file SHA256 remains
`57c1b1133bb78c1074fc3e42a93bfafcdf5c8bc4a4cf48d32177e224df798590`.
Private artifacts/exports stay outside Git and the served build.

## Production gate and rollback

Fresh public HTTP200 still serves old `index-DVKun6is.js`, SHA256
`256d23d280dd2835998a6fec9b5d6944295391cea1b54894caccf5e484a60294`.
This proves the old served build, not the active Vercel deployment ID.

ChatGPT's assignment reports deployment candidates
`dpl_VVhEpdqKdtkZ7gDw1wwjuLdVShZg` (df1592c) and
`dpl_DAUCNvbmqaXXG8Vws8CHF6Hdh4tf` (2cc6f7f). Their current alias/READY status
must be freshly verified before switching. Connector project/alias reads return403;
no authenticated Vercel CLI or available browser session is present. Do not
push main or claim a Production deployment until that gate is resolved.

After restoring access: verify existing project
`prj_M9ros7UaB46r806Imhis2U3u3EeC`, team
`team_qOLNqPdFP06jXgNOg50iXcgL`, current primary alias, retained rollback
deployment, and exact candidate SHA. Inspect/test the isolated preview, then stage
the Production build, verify it and promote on `maskedsingerbet.vercel.app`.

Rollback procedure after verifying the old deployment: (1) restore the primary
domain to that retained deployment using Vercel rollback/promotion; (2) reload and
verify the old asset and state. If the user has explicitly activated S13 meanwhile,
retain the current S13 export and use a separately retained pre-switch CLASSIC
export for old-code recovery. Old code compatibility with activated S13 exports
is not claimed. Source tags alone do not undo an intentional ruleset conversion.

Actual current iPad/device exports are not backed up by these isolated tests.
Before a switch, users should export their current state on each relevant origin.
LAN and public origins remain separate; no Cloud/Firebase/sync or extra project.
