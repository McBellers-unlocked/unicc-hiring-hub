

## Add "Find out more" Link on Hiring Guide Page

A single addition in `src/pages/HiringProcessGuide.tsx` after the "About UNICC" paragraph text.

Add a line like: **"Find out more about us here:"** followed by a link to [https://www.unicc.org](https://www.unicc.org), styled consistently with the existing email link (using `text-primary hover:underline`).

### Technical Detail

Insert a new paragraph element after the existing "About UNICC" description text (around line 340), with an external link (`target="_blank"` and `rel="noopener noreferrer"`) pointing to `https://www.unicc.org`.

