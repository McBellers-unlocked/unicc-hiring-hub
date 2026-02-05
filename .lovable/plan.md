
## Plan: Add HR Operations Dropdown with Operations Pages

### Overview
Add a new "HR Operations" dropdown menu in the header navigation (between "Applications" and "My Career") with 12 sub-pages for various HR operations functions.

---

### 1. New Routes and Pages

Create 12 placeholder pages under `/operations/*`:

| Route | Page Component | Display Name |
|-------|----------------|--------------|
| `/operations/separations` | `Separations.tsx` | Separations |
| `/operations/appointments` | `Appointments.tsx` | Appointments |
| `/operations/loans-secondments` | `LoansSecondments.tsx` | Loans and Secondments |
| `/operations/unv` | `UNVOperations.tsx` | UNV |
| `/operations/interns` | `Interns.tsx` | Interns |
| `/operations/stdas` | `STDAs.tsx` | STDAs |
| `/operations/pd-revisions` | `PDRevisions.tsx` | PD Revisions and Promotions |
| `/operations/part-time` | `PartTime.tsx` | Part Time |
| `/operations/slwop` | `SLWOP.tsx` | SLWOP |
| `/operations/protocol-services` | `ProtocolServices.tsx` | Protocol Services |
| `/operations/home-leave` | `HomeLeave.tsx` | Home Leave |
| `/operations/contract-extensions` | `ContractExtensions.tsx` | Contract Extensions |

---

### 2. Header Navigation Update

Add new dropdown in `Layout.tsx` after "Applications" link (around line 229):

```text
+--------------------------------------------------+
| Dashboard | Jobs | Life at UNICC | Pipeline v |
| Manage v | Applications | HR Operations v |
| My Career v |
+--------------------------------------------------+
```

The dropdown will include:
- Icon: `Cog` or `ClipboardList` 
- All 12 operation links organized in a single list

---

### 3. Page Structure

Each placeholder page will follow a consistent template:

```tsx
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconName } from 'lucide-react';

const PageName = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Page Title</h1>
          <p className="text-muted-foreground mt-1">
            Description of what this page will contain
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is under development.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PageName;
```

---

### 4. Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/pages/operations/Separations.tsx` | Staff separations management |
| `src/pages/operations/Appointments.tsx` | New appointments tracking |
| `src/pages/operations/LoansSecondments.tsx` | Loans and secondments |
| `src/pages/operations/UNVOperations.tsx` | UN Volunteers operations |
| `src/pages/operations/Interns.tsx` | Intern management |
| `src/pages/operations/STDAs.tsx` | Short-term duty assignments |
| `src/pages/operations/PDRevisions.tsx` | PD revisions and promotions |
| `src/pages/operations/PartTime.tsx` | Part-time arrangements |
| `src/pages/operations/SLWOP.tsx` | Special leave without pay |
| `src/pages/operations/ProtocolServices.tsx` | Protocol services |
| `src/pages/operations/HomeLeave.tsx` | Home leave management |
| `src/pages/operations/ContractExtensions.tsx` | Contract extensions |

---

### 5. Files to Modify

| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add HR Operations dropdown with all 12 links |
| `src/App.tsx` | Add routes for all 12 operations pages |

---

### 6. Navigation Dropdown Implementation

```tsx
{hasAdminAccess && (
  <DropdownMenu>
    <DropdownMenuTrigger className="flex items-center hover:opacity-80 transition-colors py-2 focus:outline-none">
      <ClipboardList className="w-4 h-4 mr-1" />
      HR Operations
      <ChevronDown className="w-3 h-3 ml-1" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="bg-popover border border-border shadow-lg">
      <DropdownMenuItem asChild>
        <Link to="/operations/separations">Separations</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/operations/appointments">Appointments</Link>
      </DropdownMenuItem>
      <!-- ... remaining 10 items ... -->
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

---

### Implementation Order

1. Create `src/pages/operations/` directory
2. Create all 12 placeholder page components
3. Add routes to `App.tsx`
4. Add HR Operations dropdown to `Layout.tsx`
