

## Plan: Add Enhanced Color Coding for Contract Status Badges

### Goal
Implement a more granular visual status system with specific colors:
- **Green**: Active contracts (more than 60 days remaining)
- **Black/Gray**: No data available
- **Purple**: Starting within 60 days
- **Amber/Yellow**: Expiring within 30 days
- **Red/Striped gradient**: Critical - within 14 days or expired

---

### Technical Approach

Instead of using the limited Badge `variant` prop, we'll use custom CSS classes for each status type. This gives us full control over colors including the striped gradient for critical items.

---

### Changes

**File: `src/pages/AffiliatePersonnel.tsx`**

1. **Update the return type** of `getContractStatus` to include a `colorClass` property instead of relying on variant:

```typescript
const getContractStatus = (...): { 
  status: string; 
  colorClass: string;  // Custom CSS class for styling
  daysRemaining: number | null;
  isNotYetActive: boolean;
  isContractBreak: boolean;
  isNoData: boolean;
  isCritical: boolean;  // For 14-day striped effect
}
```

2. **Update status logic** with new color classes:

| Scenario | Days | Color Class | Visual |
|----------|------|-------------|--------|
| Active | >60 days | `bg-green-100 text-green-700` | Green |
| No Data | N/A | `bg-gray-800 text-white` | Black |
| Starting soon (new hire) | <60 days | `bg-purple-100 text-purple-700` | Purple |
| Contract break | N/A | `bg-yellow-100 text-yellow-700` | Amber |
| Expiring soon | 31-60 days | `bg-purple-100 text-purple-700` | Purple |
| Expiring soon | 15-30 days | `bg-amber-100 text-amber-700` | Amber |
| Critical | 0-14 days | Animated gradient stripes | Red striped |
| Expired | <0 days | `bg-red-100 text-red-700` | Red |

3. **Add CSS for striped gradient** effect for critical contracts:

```typescript
// For 14 days or less - animated striped gradient
const criticalClass = "bg-gradient-to-r from-red-500 via-red-300 to-red-500 
  bg-[length:200%_100%] animate-pulse text-white";
```

4. **Update Badge rendering** to use custom classes instead of variant:

```tsx
<Badge className={contractStatus.colorClass}>
  {/* icon logic */}
  {contractStatus.status}
</Badge>
```

5. **Update stats calculation** to include new categories (60d, 30d, 14d thresholds)

---

### Color Reference

| Status | Background | Text | Notes |
|--------|-----------|------|-------|
| Active (>60d) | `green-100` | `green-700` | Healthy |
| No Data | `gray-800` | `white` | Missing info |
| Starting <60d | `purple-100` | `purple-700` | Upcoming |
| Contract Break | `yellow-100` | `yellow-700` | On break |
| Expiring 31-60d | `purple-100` | `purple-700` | Attention |
| Expiring 15-30d | `amber-100` | `amber-700` | Warning |
| Critical (0-14d) | Striped red gradient | `white` | Urgent |
| Expired | `red-100` | `red-700` | Action needed |

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AffiliatePersonnel.tsx` | Update status logic and badge styling |

