

## Add Profile Photo to Aisha Mbeki

### Approach
1. Copy uploaded image to `public/images/aisha-mbeki.png`
2. Update Aisha Mbeki's `profile_photo_url` in the `candidates` table

### Files
- Copy `user-uploads://Aisha.png` → `public/images/aisha-mbeki.png`
- Data update: `UPDATE candidates SET profile_photo_url = '/images/aisha-mbeki.png' WHERE name = 'Aisha Mbeki'`

