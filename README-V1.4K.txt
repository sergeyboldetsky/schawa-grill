Schawa Grill V1.4K - Cashier ready status fix

Copy BOTH .github and deploy folders into your existing schawa-grill repository root.
Do not delete or replace the existing folders.
Commit and Push using GitHub Desktop.
GitHub -> Actions -> Schawa Grill - Netcup V1.4K cashier ready fix -> Run workflow.
First run: deploy UNCHECKED (read-only check).
Second run: deploy CHECKED (backs up and replaces only httpdocs/api/orders/staff-action.php).

Expected behavior:
- Cook clicks 'Поставил готовиться': item becomes cooking and disappears from cook screen.
- Cashier clicks 'Готово': when every non-cancelled item is cooking/ready, the server changes cooking items to ready, and changes order to ready in the same transaction.
- If any item remains new, server responds items_not_ready.
- Cashier then marks the order delivered as before.

No changes to DB schema, frontend, credentials, auth or config.php.
If server API differs from expected version, workflow stops before overwriting it.
