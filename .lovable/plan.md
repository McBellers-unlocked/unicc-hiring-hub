## Fix Header Background Color

The header uses `bg-primary` which is the same cyan-blue (#009CDE) as the "UNIQ" text in the logo, making it invisible against the background.

**Change**: Update the header in `src/components/Layout.tsx` (line 64) from `bg-primary` to a dark navy/slate that contrasts well with the logo and looks modern:

```
bg-[#1a2332] text-white
```

This dark navy (#1a2332) provides strong contrast against the cyan-blue logo text, feels modern and clean, and aligns with the "Powered by UNICC" dark blue aesthetic without using the exact UNICC dark blue.

Single line change in one file.  
  
I like the slate version better.