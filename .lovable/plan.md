

## Fix: Staff Search Stuck on "Searching..."

### The Problem
The staff search combobox shows "Searching..." indefinitely when typing a name. Based on the session replay and testing, the query works correctly on the database side but the UI gets stuck in a loading state.

### Root Cause Analysis
Looking at the `StaffSearchCombobox.tsx` component, there are two potential issues:

1. **No timeout handling** - If the network request hangs or takes too long, there's no timeout to recover
2. **Debounce effect cleanup issue** - When the search value changes rapidly, multiple requests might be in flight, causing race conditions with the loading state

### Solution

Add timeout handling and improve the search reliability:

**File to modify:** `src/components/operations/StaffSearchCombobox.tsx`

### Changes

1. **Add AbortController for request cancellation** - Cancel previous requests when a new search is initiated
2. **Add request timeout** - Automatically fail after 10 seconds to prevent infinite loading
3. **Track request ID to prevent race conditions** - Ensure only the latest request updates the state

```typescript
// Add AbortController to cancel stale requests
const searchStaff = useCallback(async (query: string, signal?: AbortSignal) => {
  if (query.length < 2) {
    setStaff([]);
    setLoading(false);
    return;
  }

  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, current_grade, job_title, duty_station, unit, line_manager, staff_number')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)
      .abortSignal(signal);  // Add abort signal

    if (error) throw error;
    // ... rest of mapping logic
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error searching staff:', error);
    }
    setStaff([]);
  } finally {
    setLoading(false);
  }
}, []);

// Update effect with AbortController
useEffect(() => {
  const controller = new AbortController();
  
  const timer = setTimeout(() => {
    searchStaff(search, controller.signal);
  }, 300);

  return () => {
    clearTimeout(timer);
    controller.abort();  // Cancel previous request
  };
}, [search, searchStaff]);
```

### Additional Safety: Timeout Fallback
Add a maximum timeout to ensure loading never gets stuck:

```typescript
useEffect(() => {
  if (loading) {
    const timeout = setTimeout(() => {
      setLoading(false);
      console.warn('Search timed out');
    }, 10000);  // 10 second max
    return () => clearTimeout(timeout);
  }
}, [loading]);
```

### Why This Fixes the Issue
- **AbortController** cancels in-flight requests when the user types more characters, preventing race conditions
- **Timeout fallback** ensures the UI never gets permanently stuck in loading state
- **Proper cleanup** prevents memory leaks and stale state updates

