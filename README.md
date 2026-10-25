# Liber Pro website and CI/CD

The repository contains the current public liberpro.pl website, synchronized from the verified hosting backup on 25 October 2026. Only the 94 public website files listed in `ci/managed-files.json` are deployed. CI tools, credentials, CGI configuration, client portal, databases and other domains are outside deployment scope.

## Automatic checks

GitHub Actions runs on pull requests and pushes to main. Validation covers HTML, links, sitemap, translations, redirects, calculators including decimal boundary cases, consent, contact tracking and recent content changes. PHP 8.4 executes the actual contact endpoint in an isolated temporary server with a local mail sink: no production form submissions or real emails. Browser tests check mobile, tablet and desktop layouts, navigation, calculators, ZUS keyboard controls and cookie preferences. Failure injection tests cover deployment backups, manual hosting drift and restoration.

Run `python ci/run.py --require-php`, `python ci/tests/deployment.py`, `node ci/tests/recent.cjs` and `npm run test:browser`. PHP 8.4, Node 24, Python 3 and installed Playwright Chromium are required for a complete local run. GitHub provides these tools; nothing is installed on the hosting account by CI.

## Production deployment

Publication is manual and requires a separate instruction from the owner. Pushes and pull requests run automatic tests only. There is no recurring hosting task and no periodic GitHub polling. A workflow started with its default settings also runs tests only.

The reviewed publication tool remains outside WWW at `/home/liberpro/domains/liberpro.pl/ci-agent/`. Its configuration is `{"mode":"manual"}`. Starting `worker.py` without `--commit` exits before any hosting checks or GitHub requests. A publication requires an explicitly supplied complete commit SHA, which must match current main and have successful Validate and Browser jobs. Source data is downloaded over verified HTTPS; downloaded programs are never executed, and the tool never updates itself.

When the owner explicitly requests publication, first confirm the required tests, then run once on the hosting account:

```sh
/usr/bin/python3 /home/liberpro/domains/liberpro.pl/ci-agent/worker.py --commit <approved-40-character-main-SHA>
```

Use a one-off hosting execution, not a recurring task. If a temporary cron entry is needed because SSH is unavailable, restrict it to the intended execution and remove it after completion; do not restore the five-minute schedule. GitHub's manual workflow input `deploy=true` verifies the receipt of this explicitly started hosting publication; it does not start the hosting tool itself. Ordinary pushes always skip that verification job.

A domain marker outside WWW verifies the repository and document root. Initial hashes come from the verified backup; subsequent releases use the last successful state. Unexpected manual hosting changes stop publication before writes. Reconcile those changes into the repository after review.

Before each release, managed public files are backed up to `ci-backups/` outside WWW. Changed files are staged outside WWW, then replaced by per-file atomic renames. Checksums and 18 public HTTP checks must pass. Failures after publication starts restore previous files and release metadata; failure injection tests cover these paths using real temporary files. This is atomic per file, not one transaction for the whole website. A disk or permission failure can require manual recovery from the identified backup.

`ci-agent/last-result.json` records the private backup path and checksums. Public `deployment-status.json` contains only the successful commit, workflow run, publication time and check count. GitHub waits for this receipt and independently verifies the public website, so green deployment status requires actual publication. No forms or email are sent.

The former `LIBERPRO_DEPLOY_ENABLED` variable is disabled and no longer controls this manual workflow. Do not re-enable recurring publication or the FTP account as part of ordinary editing. Backups, credentials, portal files and databases must never be added to the public repository.

The initial synchronized release may change zero website files while still verifying write permission, saving a backup and recording the release. Source changes after activation require passing both protected main checks.
