

## Fix Header Cut Off on Right Side

The root cause is in `src/App.css` (line 2-3):

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
}
```

This constrains the entire application including the header to 1280px, causing the blue background to not extend to the right edge on wider screens.

**Fix**: Remove `max-width` and `margin: 0 auto` from `#root` in `src/App.css`. The layout components already handle their own width constraints via `container mx-auto`.

Also remove `padding: 2rem` and `text-align: center` which are Vite boilerplate defaults that shouldn't be applied globally.

Single file change — clean up `src/App.css` to remove these restrictive root styles.

