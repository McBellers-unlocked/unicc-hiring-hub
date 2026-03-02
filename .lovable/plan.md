

## Add Profile Photo to Sarah Chen

### Approach
1. Copy the uploaded image to `public/images/sarah-chen.png` so it's accessible via URL
2. Run a SQL migration to update Sarah Chen's `profile_photo_url` field in the `candidates` table to point to `/images/sarah-chen.png`

### Files
- Copy `user-uploads://Professional_headshot_in_a_modern_office.png` → `public/images/sarah-chen.png`
- SQL migration: `UPDATE candidates SET profile_photo_url = '/images/sarah-chen.png' WHERE name = 'Sarah Chen'`

The photo will then appear in the avatar area of her LinkedIn-style profile sheet.

