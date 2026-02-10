

# Forgot Password / Password Recovery Flow

## What We're Building
A complete password recovery flow with two parts:
1. A "Forgot Password?" link on the Auth sign-in form that lets users request a reset email
2. A dedicated Reset Password page where users set a new password after clicking the email link

## How It Works

1. **User clicks "Forgot Password?"** on the sign-in tab -- a simple email input form appears
2. **User enters their email** and clicks "Send Reset Link"
3. **Supabase sends a password reset email** using `resetPasswordForEmail()` with `redirectTo: https://staging.unicconnect.org/reset-password`
4. **User clicks the link in their email** -- they land on `/reset-password` with a recovery token in the URL
5. **User enters a new password** -- the app calls `supabase.auth.updateUser({ password })` to complete the reset
6. **User is redirected to the dashboard** with a success message

## Changes

### 1. Update Auth Page (`src/pages/Auth.tsx`)
- Add a "Forgot Password?" link below the Sign In button
- When clicked, toggle to a simple form: email input + "Send Reset Link" button
- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://staging.unicconnect.org/reset-password' })` using the `VITE_PUBLIC_SITE_URL` env variable
- Show success message: "If an account exists with that email, you'll receive a reset link"
- Add a "Back to Sign In" link to return to the login form

### 2. Create Reset Password Page (`src/pages/ResetPassword.tsx`)
- New password + confirm password form
- On mount, Supabase auto-detects the recovery token from the URL hash fragment and establishes a session
- Listen for `PASSWORD_RECOVERY` event via `onAuthStateChange`
- On submit, call `supabase.auth.updateUser({ password: newPassword })`
- Validate: minimum 8 characters, passwords must match
- On success, redirect to `/` with a toast: "Password updated successfully"
- On error, show descriptive error message

### 3. Add Route (`src/App.tsx`)
- Add `<Route path="/reset-password" element={<ResetPassword />} />` alongside the existing `/auth` route

### 4. Add Redirect URL in Supabase Dashboard (manual step)
- Ensure `https://staging.unicconnect.org/reset-password` is covered by the existing wildcard redirect URL (`https://staging.unicconnect.org/**`)

## Technical Details

- Uses `import.meta.env.VITE_PUBLIC_SITE_URL` for the redirect URL so it works across environments
- Follows the existing Auth page styling (same Card, UNICCLogo, and layout patterns)
- No database changes required -- this uses Supabase's built-in auth recovery flow
- No edge functions needed -- the reset email is handled natively by Supabase

