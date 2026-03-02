

## Add Profile Photo to David Park

### Approach
1. Copy uploaded image to `public/images/david-park.png`
2. Update David Park's `profile_photo_url` in the `candidates` table

### Files
- Copy `user-uploads://David_Park.png` → `public/images/david-park.png`
- Data update: `UPDATE candidates SET profile_photo_url = '/images/david-park.png' WHERE name = 'David Park'`

