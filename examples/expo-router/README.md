# AussieAuth Expo Router Example

```sh
cp .env.example .env.local
bun install
npx expo install expo-secure-store expo-web-browser
bun run start
```

Register the native origins with your AussieAuth deployment:

```sh
bunx aussieauth apps register \
  --auth-url "$EXPO_PUBLIC_AUSSIEAUTH_URL" \
  --secret "$AUSSIEAUTH_SECRET" \
  --slug aussieauth-expo \
  --name "AussieAuth Expo" \
  --scheme aussieauthdemo \
  --dev-exp
```
