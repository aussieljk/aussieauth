import { Field } from "@aussieljk/auth";

// A labelled text input — the panels' basic form row.

export const Email = () => (
  <div style={{ maxWidth: 340 }}>
    <Field label="Email" type="email" placeholder="you@example.com" defaultValue="" />
  </div>
);

export const Filled = () => (
  <div style={{ maxWidth: 340 }}>
    <Field label="Full name" placeholder="Lucas" defaultValue="Lucas Knight" />
  </div>
);

export const Password = () => (
  <div style={{ maxWidth: 340 }}>
    <Field label="Password" type="password" defaultValue="hunter2hunter2" />
  </div>
);
