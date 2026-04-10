

## Update Header to Use Uploaded Logo with Light Background

### What
Replace the dark blue header with a light, executive-style header using the uploaded UNIQTalent logo image. Remove the text-based "UNIQTalent" label entirely.

### Changes

**1. Copy logo to project**
- Copy `user-uploads://uniccsub_UNIQTalent_@2x-8_1.png` to `src/assets/uniqtalent-header-logo.png`

**2. Update `src/components/Layout.tsx`**
- **Header background**: Change from `bg-[#006cb5]` to `bg-[#F7FAFC]` with bottom border `border-b border-[#D9E6F2]`
- **Remove text colors**: Drop `text-white` from header; all nav text becomes `text-[#243B53]`
- **Logo area** (line ~68-71): Replace the `UNICCLogo` component + styled text span with a single `<img>` tag importing the uploaded logo. Size it at roughly `h-9` (prominent but not oversized). Remove the "UNIQ...Talent" text entirely.
- **Nav link styling**: Replace `hover:opacity-80` with `hover:text-[#009EDB]` for clear hover states on the light background
- **Dropdown triggers**: Same dark navy base color with blue hover
- **Avatar / user section**: Ensure contrast works on light background (already uses its own colored badges)
- **Mobile menu button**: Update from white icon to dark navy

### Visual result
- Clean light header (#F7FAFC) with subtle bottom border (#D9E6F2)
- Full-color UNIQTalent + "Powered by UNICC" logo on the left
- Dark navy (#243B53) nav labels and icons
- UN blue (#009EDB) on hover/active states
- No redundant text — logo speaks for itself

