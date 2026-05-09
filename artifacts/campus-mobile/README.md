# Campus Mobile

Native Expo version of the Campus student app.

This is intentionally isolated from the existing web app and backend code. It reuses the same API contract, but all files live under `artifacts/campus-mobile`.

## Run

```bash
pnpm install
pnpm --filter @workspace/campus-mobile dev
```

Set the API host for a real phone before launching:

```bash
$env:EXPO_PUBLIC_API_URL="http://YOUR-LAN-IP:5000/api"
pnpm --filter @workspace/campus-mobile dev
```

The mobile app uses the existing API server and database. It replaces browser-only pieces such as `localStorage`, Leaflet, and DOM layouts with React Native storage, Expo location, native tabs, and `react-native-maps`.
