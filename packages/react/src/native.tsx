import { callbackURL } from "./client";
import { readEnv } from "./env";
import { explainAussieAuthError } from "./errors";
import { byId, ctaFor, PROVIDERS } from "./providers";
import { PENDING_ACCOUNT_NUMBER } from "./storage";
import type { AussieAuthExpoClient } from "./expo";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

type NativeAuthClient = AussieAuthExpoClient & Record<string, any>;
const loose = (client: NativeAuthClient) => client as Record<string, any>;

export type AussieAuthNativeSignInProps = {
  authClient: NativeAuthClient;
  appName?: string;
  methods?: string[];
  featured?: string[];
  primary?: string;
  title?: string;
  subtitle?: string;
  onSignedIn?: () => void;
};

type RunnerState = {
  pending: boolean;
  error: string | null;
  notice: string | null;
};

const DEFAULT_FEATURED = ["google", "github", "apple"];
const DEFAULT_PRIMARY = "email-password";

const errorMessage = (result: unknown) => {
  if (typeof result !== "object" || result === null || !("error" in result)) return null;
  const { error } = result as { error?: { message?: string | null } | null };
  if (!error) return null;
  return explainNativeError(error.message || "Something went wrong");
};

/**
 * The same translation the web card runs, from `errors.ts`. It used to be a
 * third copy of the table — one here, one in `expo.tsx`, and none on the web —
 * which is the arrangement where two of them drift and the one that matters
 * most doesn't exist.
 *
 * The scheme is a placeholder rather than the app's real one: a native client
 * is constructed with it, but this runs at module scope where there's no
 * client to ask. The command it produces is still the right command, and
 * `--scheme` is the flag a native app needs — its Expo Go origin carries a LAN
 * address that changes with the network, so `--origin` would be wrong by
 * tomorrow.
 */
const explainNativeError = (message: string) =>
  explainAussieAuthError(message, {
    baseURL: readEnv("EXPO_PUBLIC_AUSSIEAUTH_URL", "EXPO_PUBLIC_AUSSIEAUTH_SITE_URL"),
    scheme: "<your-scheme>",
  });

export function AussieAuthNativeSignIn({
  authClient,
  appName = "AussieAuth",
  methods,
  featured = DEFAULT_FEATURED,
  primary = DEFAULT_PRIMARY,
  title,
  subtitle,
  onSignedIn,
}: AussieAuthNativeSignInProps) {
  const colors = useNativeAuthColors();
  const [method, setMethod] = useState<string | null>(null);
  const offered = methods ? PROVIDERS.filter((p) => methods.includes(p.id)) : PROVIDERS;
  const rest = offered.filter((p) => p.id !== primary && !featured.includes(p.id));
  const active = method ?? primary;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 18 }}
    >
      <View style={{ gap: 5 }}>
        {method && (
          <NativeButton
            label="All sign-in options"
            variant="ghost"
            onPress={() => setMethod(null)}
          />
        )}
        <Text style={{ color: colors.label, fontSize: 30, fontWeight: "700" }}>
          {method ? byId(method).label : (title ?? `Welcome to ${appName}`)}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 16 }}>
          {method ? byId(method).hint : (subtitle ?? `${offered.length} ways in. Pick one.`)}
        </Text>
      </View>

      {!method && (
        <View style={{ gap: 10 }}>
          {featured.map((id) => (
            <OneClickButton key={id} authClient={authClient} id={id} onSignedIn={onSignedIn} />
          ))}
        </View>
      )}

      <Panel authClient={authClient} id={active} onSignedIn={onSignedIn} />

      {!method && rest.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: "600" }}>
            More ways to sign in
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {rest.map((provider) => (
              <NativeButton
                key={provider.id}
                label={provider.label}
                variant="secondary"
                onPress={() => setMethod(provider.id)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Panel({
  authClient,
  id,
  onSignedIn,
}: {
  authClient: NativeAuthClient;
  id: string;
  onSignedIn?: () => void;
}) {
  if (id === "email-password") {
    return <EmailPasswordPanel authClient={authClient} onSignedIn={onSignedIn} />;
  }
  if (id === "magic-link") return <MagicLinkPanel authClient={authClient} />;
  if (id === "email-otp")
    return <OtpPanel authClient={authClient} kind="email" onSignedIn={onSignedIn} />;
  if (id === "sms-otp")
    return <OtpPanel authClient={authClient} kind="sms" onSignedIn={onSignedIn} />;
  if (id === "account-number") {
    return <AccountNumberPanel authClient={authClient} onSignedIn={onSignedIn} />;
  }
  if (["google", "github", "apple", "anonymous", "demo", "passkey"].includes(id)) {
    return <OneClickButton authClient={authClient} id={id} onSignedIn={onSignedIn} />;
  }
  return (
    <Notice
      message={`${byId(id).label} needs a native connector before it can run inside React Native.`}
    />
  );
}

function OneClickButton({
  authClient,
  id,
  onSignedIn,
}: {
  authClient: NativeAuthClient;
  id: string;
  onSignedIn?: () => void;
}) {
  const runner = useNativeRunner(onSignedIn);
  const provider = byId(id);
  const client = loose(authClient);
  return (
    <View style={{ gap: 8 }}>
      <NativeButton
        label={ctaFor(provider)}
        pending={runner.pending}
        onPress={() =>
          void runner.run(() => {
            if (id === "anonymous") return client.signIn.anonymous();
            if (id === "demo") return client.signIn.demo();
            if (id === "passkey") return client.signIn.passkey();
            return client.signIn.social({ provider: id, callbackURL: callbackURL() });
          })
        }
      />
      <Feedback state={runner} />
    </View>
  );
}

function EmailPasswordPanel({
  authClient,
  onSignedIn,
}: {
  authClient: NativeAuthClient;
  onSignedIn?: () => void;
}) {
  const runner = useNativeRunner(onSignedIn);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const client = loose(authClient);
  return (
    <View style={{ gap: 10 }}>
      {creating && <NativeField label="Name" value={name} onChangeText={setName} />}
      <NativeField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <NativeField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <NativeButton
        label={creating ? "Create account" : "Sign in"}
        pending={runner.pending}
        onPress={() =>
          void runner.run(() =>
            creating
              ? client.signUp.email({ email, password, name: name || email })
              : client.signIn.email({ email, password }),
          )
        }
      />
      <NativeButton
        label={creating ? "I already have an account" : "Create an account instead"}
        variant="ghost"
        onPress={() => setCreating(!creating)}
      />
      <Feedback state={runner} />
    </View>
  );
}

function MagicLinkPanel({ authClient }: { authClient: NativeAuthClient }) {
  const runner = useNativeRunner();
  const [email, setEmail] = useState("");
  const client = loose(authClient);
  return (
    <View style={{ gap: 10 }}>
      <NativeField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <NativeButton
        label="Email me a link"
        pending={runner.pending}
        onPress={() =>
          void runner.run(
            () => client.signIn.magicLink({ email, callbackURL: callbackURL() }),
            `Link sent to ${email}.`,
          )
        }
      />
      <Feedback state={runner} />
    </View>
  );
}

function OtpPanel({
  authClient,
  kind,
  onSignedIn,
}: {
  authClient: NativeAuthClient;
  kind: "email" | "sms";
  onSignedIn?: () => void;
}) {
  const runner = useNativeRunner(onSignedIn);
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const email = kind === "email";
  const client = loose(authClient);
  return (
    <View style={{ gap: 10 }}>
      {!sent ? (
        <>
          <NativeField
            label={email ? "Email" : "Phone number"}
            value={identity}
            onChangeText={setIdentity}
            keyboardType={email ? "email-address" : "phone-pad"}
            autoCapitalize="none"
          />
          <NativeButton
            label="Send code"
            pending={runner.pending}
            onPress={() =>
              void runner
                .run(() =>
                  email
                    ? client.emailOtp.sendVerificationOtp({
                        email: identity,
                        type: "sign-in",
                      })
                    : client.phoneNumber.sendOtp({ phoneNumber: identity }),
                )
                .then((ok) => {
                  if (ok) setSent(true);
                })
            }
          />
        </>
      ) : (
        <>
          <NativeField label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
          <NativeButton
            label="Verify and sign in"
            pending={runner.pending}
            onPress={() =>
              void runner.run(() =>
                email
                  ? client.signIn.emailOtp({ email: identity, otp: code })
                  : client.phoneNumber.verify({ phoneNumber: identity, code }),
              )
            }
          />
          <NativeButton
            label="Use a different address"
            variant="ghost"
            onPress={() => setSent(false)}
          />
        </>
      )}
      <Feedback state={runner} />
    </View>
  );
}

function AccountNumberPanel({
  authClient,
  onSignedIn,
}: {
  authClient: NativeAuthClient;
  onSignedIn?: () => void;
}) {
  const runner = useNativeRunner(onSignedIn);
  const [number, setNumber] = useState("");
  const client = loose(authClient);
  return (
    <View style={{ gap: 10 }}>
      <NativeField
        label="Account number"
        value={number}
        onChangeText={setNumber}
        keyboardType="number-pad"
      />
      <NativeButton
        label="Sign in"
        pending={runner.pending}
        onPress={() =>
          void runner.run(() => client.signIn.accountNumber({ accountNumber: number }))
        }
      />
      <NativeButton
        label="Generate an account"
        variant="secondary"
        pending={runner.pending}
        onPress={() =>
          void runner.run(async () => {
            const result = await client.signUp.accountNumber();
            if (result.error) return result;
            await client.storage?.setItem?.(PENDING_ACCOUNT_NUMBER, result.data.accountNumber);
            return result;
          })
        }
      />
      <Feedback state={runner} />
    </View>
  );
}

function NativeField({
  label,
  style,
  ...props
}: TextInputProps & { label: string; style?: ViewStyle }) {
  const colors = useNativeAuthColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.placeholder}
        style={[
          {
            minHeight: 48,
            borderRadius: 12,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.label,
            backgroundColor: colors.input,
            paddingHorizontal: 14,
            fontSize: 16,
          },
          style,
        ]}
      />
    </View>
  );
}

function NativeButton({
  label,
  pending = false,
  variant = "primary",
  onPress,
}: {
  label: string;
  pending?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  onPress: () => void;
}) {
  const colors = useNativeAuthColors();
  const styles = {
    primary: { backgroundColor: colors.accent, borderColor: colors.accent },
    secondary: { backgroundColor: colors.secondaryButton, borderColor: colors.border },
    ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  }[variant];
  return (
    <Pressable
      disabled={pending}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 12,
        borderCurve: "continuous",
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        opacity: pending ? 0.7 : 1,
        ...styles,
      }}
    >
      {pending ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.label} />
      ) : (
        <Text
          style={{
            color: variant === "primary" ? "#fff" : colors.label,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function Feedback({ state }: { state: RunnerState }) {
  if (!state.error && !state.notice) return null;
  return (
    <Notice tone={state.error ? "error" : "info"} message={state.error ?? state.notice ?? ""} />
  );
}

function Notice({ message, tone = "info" }: { message: string; tone?: "info" | "error" }) {
  const colors = useNativeAuthColors();
  return (
    <Text
      selectable
      style={{
        color: tone === "error" ? colors.error : colors.secondary,
        fontSize: 14,
        lineHeight: 20,
      }}
    >
      {message}
    </Text>
  );
}

function useNativeRunner(onSuccess?: () => void) {
  const [state, setState] = useState<RunnerState>({
    pending: false,
    error: null,
    notice: null,
  });

  const run = async (fn: () => Promise<unknown>, notice?: string) => {
    setState({ pending: true, error: null, notice: null });
    try {
      const failure = errorMessage(await fn());
      if (failure) {
        setState({ pending: false, error: failure, notice: null });
        return false;
      }
      setState({ pending: false, error: null, notice: notice ?? null });
      onSuccess?.();
      return true;
    } catch (error) {
      setState({
        pending: false,
        error: explainNativeError(error instanceof Error ? error.message : String(error)),
        notice: null,
      });
      return false;
    }
  };

  return { ...state, run };
}

function useNativeAuthColors() {
  const dark = useColorScheme() === "dark";
  return {
    background: dark ? "#101113" : "#f7f7f8",
    label: dark ? "#f5f5f7" : "#111113",
    secondary: dark ? "#b8b8bd" : "#5f6068",
    placeholder: dark ? "#777982" : "#9a9ca5",
    border: dark ? "#303239" : "#d8d9df",
    input: dark ? "#191b20" : "#ffffff",
    accent: "#0a84ff",
    secondaryButton: dark ? "#202228" : "#ffffff",
    error: "#ff453a",
  };
}
