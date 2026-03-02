

## Add Profile Photo to Elena Kowalski

### Approach
1. Copy uploaded image to `public/images/elena-kowalski.png`
2. Update Elena Kowalski's `profile_photo_url` in the `candidates` table (id: `08ea2459-cc98-4b32-a704-d67d379a245c`)

### Files
- Copy `user-uploads://Elanor.png` → `public/images/elena-kowalski.png`
- Data update: `UPDATE candidates SET profile_photo_url = '/images/elena-kowalski.png' WHERE id = '08ea2459-cc98-4b32-a704-d67d379a245c'`

