Schawa Grill V1.5A: live queue patch.
Copy deploy/ and .github/ into the ROOT of the schawa-grill GitHub repository.
GitHub Actions -> Schawa Grill - Netcup V1.5A live staff orders -> Run workflow -> deploy checked.
After success, open /kitchen/ and /cook/ without server_test=1; refresh Ctrl+F5.
Demo mode remains available with ?demo=1.
Changes only staff-native.js; PHP, MySQL, frontend untouched.
Original sha256: b01c4651b1eb639517c645417a1f9cd487fb4e9a503c9602204602164942e2d1
