# Security Implementation Plan: Authentication & Authorization

## Current State

Currently, the application uses hardcoded passwords:

- **Admin**: `888` (for Dashboard Reset, Data Integrity)
- **General Operations**: `1234` (for Undo, Edit Reports)

Sensitive operations such as:

- Undoing closure steps (`Step8Closure`).
- Editing/Deleting Collection Reports.
- performing Factory Resets on the Dashboard.
- Integrity Checks.

This is a temporary measure and is **not secure** for production use.

## Objective

Replace the hardcoded password mechanism with a robust, role-based authentication system.

## Proposed Architecture

### 1. Authentication Service

Integrate a secure authentication provider.

- **Recommended**: Firebase Authentication or Auth0 (for ease of integration with React).
- **Alternative**: Custom JWT-based auth if a backend exists (e.g., Node.js/Express).

### 2. User Roles & Permissions

Define clear roles to manage access control:

- **Admin**: Full access (Reset, Delete, Management).
- **Manager**: Operational overhead (Undo, Edit Reports).
- **Operator**: Daily operations (Input, Process).
- **Viewer**: Read-only access.

### 3. Implementation Steps

#### Phase 1: Setup Auth Context

- Create an `AuthContext` to manage user session state (`user`, `token`, `role`).
- Implement `useAuth()` hook for easy access in components.

```typescript
// types.ts
export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';
export interface User {
    uid: string;
    email: string;
    role: UserRole;
}
```

#### Phase 2: Protect Routes and Components

- Wrap sensitive components (like `Dashboard` reset buttons or `COLReport` edit buttons) with a `Protected` component or check `user.role`.

```tsx
<Protected role="ADMIN">
    <button onClick={handleFactoryReset}>Factory Reset</button>
</Protected>
```

#### Phase 3: Replace Hardcoded Checks

Refactor existing password checks to verify user permissions instead.

**Before:**

```typescript
const { value: password } = await Swal.fire({ title: 'Enter Password', input: 'password' });
if (password === '8888') { runAction(); }
```

**After:**

```typescript
const { user } = useAuth();
if (user?.role === 'ADMIN') {
    runAction();
} else {
    Swal.fire('Access Denied', 'You do not have permission', 'error');
}
```

### 4. Audit Logging

- Record sensitive actions (who did what and when) to a database (e.g., Firestore or SQL).
- Include `userId`, `actionType`, `timestamp`, and `details`.

## Timeline

1. **Week 1**: Setup Auth Provider and Context.
2. **Week 2**: Define Roles and assignment logic.
3. **Week 3**: Refactor key components (`Step8Closure`, `Dashboard`, `COLReport`) to use Auth Context.
4. **Week 4**: Testing and Audit Log implementation.
