// Entry point redirect for Expo in pnpm monorepo
// Metro resolves the entry from the monorepo root, so this file
// redirects to the actual mobile app entry point.
import { registerRootComponent } from "expo";
import App from "./apps/mobile/App";

registerRootComponent(App);
