Schawa Grill V1.4L: Cashier 3-column layout only.
Copy .github and deploy into the ROOT of the local schawa-grill repository (merge folders).
GitHub Desktop: Commit -> Push origin.
GitHub Actions: Schawa Grill - Netcup V1.4L cashier layout -> Run workflow -> check deploy -> Run workflow.
Reload /kitchen/ with Ctrl+F5. On wide screens board has 3 columns; <=900px 2, <=600px 1.
No database changes. Does not enable public ordering or modify server API.
