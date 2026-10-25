# Liber Pro website and CI/CD

The repository contains the current public liberpro.pl website, synchronized from the verified hosting backup on 25 October 2026. Only the 94 public website files listed in `ci/managed-files.json` are deployed. CI tools, credentials, CGI configuration, client portal, databases and other domains are outside deployment scope.

## Automatic checks

GitHub Actions runs on pull requests and pushes to main. Validation covers HTML, links, sitemap, translations, redirects, calculators including decimal boundary cases, consent, contact tracking and recent content changes. PHP 8.4 executes the actual contact endpoint in an isolated temporary server with a local mail sink: no production form submissions or real emails. Browser tests check mobile, tablet and desktop layouts, navigation, calculators, ZUS keyboard controls and cookie preferences. Failure injection tests cover deployment backups, manual hosting drift and restoration.

Run `python ci/run.py --require-php`, `python ci/tests/deployment.py`, `node ci/tests/recent.cjs` and `npm run test:browser`. PHP 8.4, Node 24, Python 3 and installed Playwright Chromium are required for a complete local run. GitHub provides these tools; nothing is installed on the hosting account by CI.

## Production deployment

After both checks pass, a current main revision can deploy when repository variable `LIBERPRO_DEPLOY_ENABLED` is `true`. Required encrypted Actions secrets are `LIBERPRO_FTPS_USER` and `LIBERPRO_FTPS_PASSWORD`. The dedicated user must be `cicd-liberpro@liberpro.pl`, restricted to the liberpro.pl domain directory. Verified explicit FTPS uses s67.cyber-folks.pl:21. The domain root must contain `.liberpro-cicd-target.json` with exactly:

```json
{"domain":"liberpro.pl","repository":"cichonmichal76-collab/Liberpro","documentRoot":"public_html","version":1}
```

The marker and release metadata live outside WWW. The initial file hashes are in `ci/deployment-baseline.json`. Later releases compare against the last successfully deployed hashes. Unexpected manual changes stop deployment before writes; reconcile them into the repository after review rather than bypassing the check.

Each release first saves and verifies a compressed backup of managed public files in `ci-backups/`, stages changed files in `ci-staging/`, replaces each file by rename and verifies checksums and public HTTP responses. Unmanaged server files are preserved. The initial synchronized release may change zero website files, while still verifying write access, saving a backup and recording the release.

On failure after publication starts, the script restores the previous files and release metadata. A complete network outage can prevent automatic restoration; the error identifies the backup and files requiring recovery. Replacements are atomic per file, not one transaction across the entire website. Full pre-activation backup is retained separately outside WWW.

To pause deployment set `LIBERPRO_DEPLOY_ENABLED=false`. For a reviewed rollback, run the workflow manually on main with `deploy=true` and `restore_backup` set to an existing filename in `ci-backups/`. Rollback also backs up the current managed files and runs verification. Never publish credentials or backup archives in this public repository.
