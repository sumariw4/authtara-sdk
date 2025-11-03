# @authtara/sdk

JavaScript & React SDK untuk Authentication dengan Identity Provider as a Service (IdPaaS).

## 📦 Installation

```bash
npm install @authtara/sdk
# or
bun add @authtara/sdk
# or
yarn add @authtara/sdk
```

## 🚀 Quick Start

### JavaScript SDK

```typescript
import { AuthClient } from '@authtara/sdk';

// Initialize client
const auth = new AuthClient({
  clientId: 'app_abc123', // Required: Application client ID
  apiUrl: 'https://api.yourdomain.com/widget/api', // Optional: Default '/widget/api'
});

// Sign up
const result = await auth.signUp({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
});

// Sign in
const signInResult = await auth.signIn({
  email: 'user@example.com',
  password: 'SecurePass123!',
});

// Get current user
const user = await auth.getUser();

// Sign out
await auth.signOut();
```

### React SDK

```tsx
import { AuthProvider, useAuth, SignIn, SignUp } from '@authtara/sdk/react';
import { AuthClient } from '@authtara/sdk';

// Initialize client
const authClient = new AuthClient({
  clientId: 'app_abc123',
  apiUrl: 'https://api.yourdomain.com/widget/api',
});

// Wrap your app
function App() {
  return (
    <AuthProvider client={authClient}>
      <YourApp />
    </AuthProvider>
  );
}

// Use in components
function LoginPage() {
  const { signIn, user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <div>Welcome, {user?.name}!</div>;
  }

  return <SignIn onSuccess={(result) => console.log('Signed in!', result)} />;
}
```

## 📚 API Reference

### AuthClient

#### Methods

- `signUp(data: SignUpData): Promise<AuthResult>`
- `signIn(data: SignInData): Promise<AuthResult>`
- `signOut(): Promise<void>`
- `getUser(): Promise<User | null>`
- `refreshSession(): Promise<Session>`
- `isAuthenticated(): boolean`
- `getCurrentUser(): User | null`

#### Events

- `on(event: 'signIn' | 'signOut' | 'userChanged' | 'error', handler: Function): void`
- `off(event: string, handler: Function): void`

### React Hooks

- `useAuth()` - Main auth hook
- `useUser()` - Get current user
- `useSignIn()` - Sign in with loading state
- `useSignUp()` - Sign up with loading state
- `useSignOut()` - Sign out with loading state

### React Components

- `<AuthProvider>` - Context provider
- `<SignIn>` - Pre-built sign in form
- `<SignUp>` - Pre-built sign up form
- `<UserButton>` - User info & sign out button

## 📖 Documentation

Full documentation available at: [Your Docs URL]

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT

## 🔗 Links

- [Repository](https://github.com/your-org/saas-backend)
- [Issues](https://github.com/your-org/saas-backend/issues)

