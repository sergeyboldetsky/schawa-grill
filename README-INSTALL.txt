Schawa Grill V1.4I - GitHub -> Netcup

1. Copy .github/workflows/netcup-deploy-v14i.yml and deploy/v1.4i into your GitHub repository root.
2. Commit and Push.
3. Actions -> Schawa Grill - Netcup V1.4I deploy -> Run workflow. Leave deploy unchecked for read-only test.
4. If green, Run workflow again with deploy checked. This uploads only four allowlisted files and backs up existing files to private/github-deploy-backups.
5. Check /kitchen/?server_test=1 and /cook/?server_test=1.

Do not commit private/config.php, passwords, or tokens. No automatic push deploy is enabled.
