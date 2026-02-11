

## Populate Video Interview/Written Assessment Section with PDF Content

Replace the current placeholder bullet points (lines 162-187) in the Video Interview/Written Assessment section with the actual content from the Modern Hire Guidelines PDF, organized into meaningful sub-sections.

### New Content Structure

The two existing cards ("Format" and "Tips for Success") will be replaced with four cards to better organize the PDF content:

1. **What is an Asynchronous Interview?** -- Brief explanation that candidates record responses at their convenience, not in real-time.

2. **Recording Your Responses -- Do's** -- Dress appropriately, ensure quiet space, questions presented one at a time, restricted reading time, specific recording time (2-3 mins), look at camera, be clear and concise, relax and breathe.

3. **Recording Your Responses -- Don'ts** -- Don't use monitor as light source, don't click pens/tap fingers, don't feel obligated to use full time, don't rely on AI/chat tools like GPT.

4. **Preparation and Tips** -- Find quiet well-lit space, test equipment, review job description, complete within specified timeframe, plan accordingly as you may not be able to pause/restart.

### Technical Detail

- Replace lines 162-187 in `src/pages/HiringProcessGuide.tsx`
- Switch from a 2-column grid to a 2x2 grid (`grid gap-4 md:grid-cols-2`)
- Keep existing styling patterns (colored backgrounds, icons, bullet points)
- Use blue for info cards, green for do's, red/orange for don'ts, and yellow for preparation

