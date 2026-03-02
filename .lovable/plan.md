

## Add Profile Photo to Maria Santos

### Approach
1. Copy uploaded image to `public/images/maria-santos.png`
2. SQL migration to update Maria Santos' `profile_photo_url` to `/images/maria-santos.png`

### Files
- Copy `user-uploads://Maria.png` → `public/images/maria-santos.png`
- SQL migration: `UPDATE candidates SET profile_photo_url = '/images/maria-santos.png' WHERE name = 'Maria Santos'`

