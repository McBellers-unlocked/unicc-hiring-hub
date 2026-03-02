

## Create 5 Rich Candidate Profiles

I'll insert 5 new candidates into the `candidates` table following the same rich data structure as Sarah Chen. Each will have detailed work experience, education, skills, certifications, and languages.

### The 5 Profiles

1. **Maria Santos** — Finance / Treasury specialist, 10 years experience. Based in Geneva. **Has UN experience** (worked at UNDP). MBA from LSE.

2. **James Whitfield** — HR / People Operations specialist, 8 years experience. Based in New York. **Has UN experience** (worked at UNICEF). Master's in Organizational Psychology.

3. **Aisha Mbeki** — Operations Management specialist, 11 years experience. Based in Nairobi. No UN experience. Supply chain and logistics background. Bachelor's + PMP certified.

4. **David Park** — Project Management / Programme Delivery specialist, 9 years experience. Based in Brussels. No UN experience. PRINCE2 and PMP certified. Master's in International Development.

5. **Elena Kowalski** — Finance / Risk & Compliance specialist, 14 years experience. Based in Vienna. No UN experience. CPA and ACCA certified. Worked at Big 4 firms.

### Implementation
- Single SQL INSERT via the migration tool with all 5 candidates
- Each candidate gets: professional_summary, 3-4 work_experience entries, 2 education entries, 8-15 skills, certifications, languages
- `un_experience: true` and `un_organizations_worked` set for Maria Santos and James Whitfield
- All set to `willing_to_relocate: true` and varied `has_security_clearance` values

### File changes
- None — this is a data-only change via SQL migration

