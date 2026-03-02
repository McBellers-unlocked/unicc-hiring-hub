

## Add Profile Photo to James Whitfield

### Approach
1. Copy uploaded image to `public/images/james-whitfield.png`
2. Update James Whitfield's `profile_photo_url` in the `candidates` table

### Files
- Copy `user-uploads://James.png` → `public/images/james-whitfield.png`
- Data update: `UPDATE candidates SET profile_photo_url = '/images/james-whitfield.png' WHERE name = 'James Whitfield'`

