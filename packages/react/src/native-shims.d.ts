declare module "react-native" {
  import type { ComponentType, ReactNode } from "react";

  export type ColorValue = string;
  export type StyleProp<T> = T | T[] | null | undefined;
  export type ViewStyle = Record<string, unknown>;
  export type TextStyle = Record<string, unknown>;
  export type TextInputProps = Record<string, unknown>;
  export type PressableProps = Record<string, unknown>;

  export const ActivityIndicator: ComponentType<Record<string, unknown>>;
  export const Pressable: ComponentType<PressableProps & { children?: ReactNode }>;
  export const ScrollView: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
  export const Text: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
  export const TextInput: ComponentType<TextInputProps>;
  export const View: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
  export const useColorScheme: () => "light" | "dark" | null;
}

declare module "expo-router" {
  export const Redirect: (props: { href: string }) => null;
  export const router: {
    replace: (href: string) => void;
    push: (href: string) => void;
  };
}

// Side-effect CSS imports. `noUncheckedSideEffectImports` wants a declaration
// for anything imported purely for its effect, and a stylesheet has no types
// to find — tsup keeps these as external `import` statements for the
// consumer's bundler to resolve.
declare module "*.css";
