# Liber Pro website and CI/CD

The repository contains the current public liberpro.pl website, synchronized from the verified hosting backup on 25 October 2026. Only the 94 public website files listed in `ci/managed-files.json` are deployed. CI tools, credentials, CGI configuration, client portal, databases and other domains are outside deployment scope.

## Automatic checks

GitHub Actions runs on pull requests and pushes to main. Validation covers HTML, links, sitemap, translations, redirects, calculators including decimal boundary cases, consent, contact tracking and recent content changes. PHP 8.4 executes the actual contact endpoint in an isolated temporary server with a local mail sink: no production form submissions or real emails. Browser tests check mobile, tablet and desktop layouts, navigation, calculators, ZUS keyboard controls and cookie preferences. Failure injection tests cover deployment backups, manual hosting drift and restoration.

Run `python ci/run.py --require-php`, `python ci/tests/deployment.py`, `node ci/tests/recent.cjs` and `npm run test:browser`. PHP 8.4, Node 24, Python 3 and installed Playwright Chromium are required for a complete local run. GitHub provides these tools; nothing is installed on the hosting account by CI.

## Production deployment

The hosting account blocks foreign FTP addresses. Deployment therefore runs as a local hosting pull agent, without disabling FTP protection and without storing hosting credentials in GitHub Actions. A cron job checks the public repository every five minutes. Only a current main push with successful Validate and Browser jobs is eligible. The agent downloads the exact commit over verified HTTPS and reads only allowlisted website files. It never executes programs from downloaded source and never updates its own code.

The reviewed agent is installed outside WWW at `/home/liberpro/domains/liberpro.pl/ci-agent/`. Its `config.json` enables or pauses publication. A domain marker outside WWW verifies the repository and document root before operations. Initial hashes come from the verified backup; subsequent releases use the last successful state. Unexpected manual hosting changes stop publication before writes. Reconcile those changes into the repository after review.

Before each release, managed public files are backed up to `ci-backups/` outside WWW. Changed files are staged outside WWW, then replaced by per-file atomic renames. Checksums and 18 public HTTP checks must pass. Failures after publication starts restore previous files and release metadata; failure injection tests cover these paths using real temporary files. This is atomic per file, not one transaction for the whole website. A disk or permission failure can require manual recovery from the identified backup.

`ci-agent/last-result.json` records the private backup path and checksums. Public `deployment-status.json` contains only the successful commit, workflow run, publication time and check count. GitHub waits for this receipt and independently verifies the public website, so green deployment status requires actual publication. No forms or email are sent.

To pause actual publication, set hosting `ci-agent/config.json` to `{"enabled":false}`. Repository variable `LIBERPRO_DEPLOY_ENABLED=false` additionally pauses GitHub's receipt-verification job; changing that variable alone does not stop the hosting agent. To resume publication and verification, enable both. Re-run a failed main workflow after correcting its cause. Public backups, credentials, portal files and databases must never be added to the repository.

The initial synchronized release may change zero website files while still verifying write permission, saving a backup and recording the release. Source changes after activation require passing both protected main checks.
