import { PanelForm, Field, Submit } from "@aussieljk/auth";

// The thin <form> wrapper the panels build on — a vertical stack that calls
// onSubmit and prevents the default navigation. Shown here composed with the
// fields it's meant to hold.

export const Composed = () => (
  <div style={{ maxWidth: 380 }}>
    <PanelForm onSubmit={() => {}}>
      <Field label="Email" type="email" placeholder="you@example.com" defaultValue="" />
      <Field label="Password" type="password" defaultValue="" />
      <Submit pending={false}>Sign in</Submit>
    </PanelForm>
  </div>
);
