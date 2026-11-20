# Lintasku Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. User profiles (`/users/{userId}`) contain PII (`email`, `phone`) and may only be read or written by the authenticated verified owner (`request.auth.uid == userId`) or an admin. Self-assigned privilege fields (`role`, `isAdmin`) are forbidden.
2. Saved addresses (`/users/{userId}/addresses/{addressId}`) belong exclusively to their parent `/users/{userId}` document (`exists()` check on parent) and are readable/writable only by `userId`.
3. Orders (`/orders/{orderId}`) must declare `userId == request.auth.uid`, valid `serviceType`, valid `status`, non-negative monetary amounts (`subtotal`, `discount`, `fee`, `total`), and server timestamps (`createdAt == request.time`). Once `status` reaches terminal `'completed'` or `'cancelled'`, non-admin updates are blocked.
4. Conversations (`/conversations/{conversationId}`) belong to `userId == request.auth.uid`. List queries must match `resource.data.userId == request.auth.uid`.
5. Messages (`/conversations/{conversationId}/messages/{messageId}`) require parent conversation ownership (`get()` Master Gate on create/get) and matching `userId == request.auth.uid` on list.
6. Bug reports (`/bug_reports/{reportId}`) must belong to `userId == request.auth.uid`, initialize with `status == 'open'`, enforce field sizes matching `firebase-blueprint.json`, and restrict `status` resolution updates to `isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on User Create**: `{ userId, displayName, email, demoBalance: 0, demoPoints: 0, isAdmin: true, createdAt, updatedAt }` -> Rejected by `hasOnly(...)`.
2. **Identity Spoofing on Order Create**: `{ orderId: "o1", userId: "victim-uid", ... }` by attacker UID -> Rejected by `data.userId == request.auth.uid`.
3. **Unverified Email Spoof**: Request where `request.auth.token.email == 'alfathadiputra24@gmail.com'` but `email_verified == false` -> Rejected by `isVerifiedUser()`.
4. **PII Read by Non-Owner**: `get /users/victim-uid` by another signed-in user -> Rejected by `isOwner(userId) || isAdmin()`.
5. **Blanket List Query on Orders**: `list /orders` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid`.
6. **ID Poisoning**: Document ID > 128 chars or containing `../$!` -> Rejected by `isValidId()`.
7. **Timestamp Forgery**: `create` with client-provided past `createdAt` (`!= request.time`) -> Rejected by `incoming().createdAt == request.time`.
8. **Immutable Field Mutation**: `update` changing `userId` or `createdAt` -> Rejected by `incoming().userId == existing().userId && incoming().createdAt == existing().createdAt`.
9. **Terminal State Mutation**: `update` on `/orders/o1` when `existing().status == 'completed'` -> Rejected by terminal status lock.
10. **Value Poisoning on Order**: `update` changing `total` to `-50000` or `title` to a 50KB string -> Rejected by `isValidOrderRecord(incoming())`.
11. **Orphaned Message Creation**: `create /conversations/foreign/messages/m1` where parent conversation belongs to another user -> Rejected by Master Gate `get()` on parent conversation.
12. **Client-Side Admin Escalation & BugReport Spoof**: `create` or `update` on `/admins/{uid}`, or creating `/bug_reports/{reportId}` with `status: 'resolved'` or oversized `description` -> Rejected by `allow read, write: if false` / `isValidBugReport(incoming())` & `status == 'open'`.
