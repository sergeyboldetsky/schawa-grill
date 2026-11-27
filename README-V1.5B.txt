Schawa Grill V1.5B — kitchen flow fix

Copy the contents of this archive into the ROOT of your local schawa-grill Git repository, preserving folders.
Commit -> Push origin.
GitHub Actions -> Schawa Grill - Netcup V1.5B kitchen flow fix -> Run workflow.
First run UNCHECKED (read-only baseline check). Then check deploy and run again.

Changes only:
- deploy/v1.5b/httpdocs/assets/staff-native.js: cook sees only new items in cooking orders; no waiting orders.
- deploy/v1.5b/httpdocs/api/orders/staff-action.php: cashier can mark cooking order ready; new/cooking items become ready together.
- .github/workflows/netcup-deploy-v15b.yml: guarded backup/deploy.

No DB migrations. Does not modify public ordering.
Test: order new -> waiting (not visible to cook) -> cashier cooking (visible to cook) -> cook start (disappears from cook) -> cashier ready -> delivered.
