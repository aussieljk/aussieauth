<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

This is a project called AussieAuth. It's accessible at aussieauth.com - it's intended to be kind of like a Clerk/WorkOS AuthKit alternative that i can use with my convex projects quickly and easily.

I want it to be just a simple to use as https://shoo.dev except support all of these auth methods:

custom auth clients:

- solana wallet
- google
- github
- email + password
- phone number + password
- username + password
- passkey
- apple
- demo sign up
- anonymously sign up (mullvad like auth)
- anonymous (just like how better auth has it implemented
- OTP code in ios passwords
- magic link
- email otp
- passkey
- google one tap
- agent auth

and also not need to redirect me to any frontend to do with this if i don't want to (using shoo.dev, it would sometimes take you to 2 consent screens, one for google for shoo.dev, and one for shoo.dev for whatever the app was) - for this for google auth for example, the user should only ever see the consent screen from google, for aussieauth.com, no consent screen for the app where this is being used. i'm the only person whos going to be using this so i'm happy to give it full perms and sharing etc yk.
