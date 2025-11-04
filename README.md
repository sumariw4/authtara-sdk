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

## 🛠️ Development

### Local Development Setup

SDK ini menggunakan Bun workspaces untuk development yang lebih efisien. Tidak perlu publish ke npm untuk testing perubahan lokal.

#### Prerequisites

- Bun >= 1.0.0
- TypeScript >= 5.0.0

#### Development Workflow

1. **Build SDK**:
   ```bash
   bun run build
   ```

2. **Watch mode** (auto-rebuild saat perubahan):
   ```bash
   bun run dev:watch
   ```

3. **Type checking**:
   ```bash
   bun run type-check
   ```

4. **Linting**:
   ```bash
   bun run lint
   bun run lint:fix  # Auto-fix issues
   ```

#### Menggunakan di Project Lain (Workspace)

Untuk menggunakan SDK ini di project lain dalam workspace yang sama:

1. Pastikan workspace sudah dikonfigurasi di root `package.json`:
   ```json
   {
     "workspaces": [
       "authtara-sdk",
       "your-app"
     ]
   }
   ```

2. Di project lain, gunakan workspace dependency:
   ```json
   {
     "dependencies": {
       "@authtara/sdk": "workspace:*"
     }
   }
   ```

3. Build SDK dan jalankan watch mode:
   ```bash
   # Terminal 1: Watch SDK
   cd authtara-sdk
   bun run dev:watch
   
   # Terminal 2: Run your app
   cd your-app
   bun run dev
   ```

#### Publish ke NPM

Untuk publish ke npm registry:

1. Pastikan semua perubahan sudah di-build:
   ```bash
   bun run build
   ```

2. Update version di `package.json` jika perlu:
   ```bash
   # Manual atau menggunakan npm version
   npm version patch|minor|major
   ```

3. Publish:
   ```bash
   npm publish
   ```

   Script `prepublishOnly` akan otomatis menjalankan build sebelum publish.

## 📖 Documentation

Full documentation available at: [Your Docs URL]

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT

## 🔗 Links

- [Repository](https://github.com/your-org/saas-backend)
- [Issues](https://github.com/your-org/saas-backend/issues)

