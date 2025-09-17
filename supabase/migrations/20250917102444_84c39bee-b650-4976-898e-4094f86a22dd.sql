-- Update test data for approval workflow testing using valid status values

-- Set one requisition for Chief of Division approval (HR reviewed, but chief not decided yet)
UPDATE job_requisitions 
SET hr_reviewed = true, 
    chief_of_division_approval = null,
    status = 'draft'
WHERE id = '6436ee5c-0708-4900-bf31-b7a40a355701';

-- Set one requisition for Director approval (HR reviewed and Chief approved, but director not decided yet)  
UPDATE job_requisitions 
SET hr_reviewed = true,
    chief_of_division_approval = true,
    chief_of_division_approved_at = now(),
    director_approval = null,
    status = 'draft'
WHERE id = '5441764c-46cb-4049-9f3d-af392f52c218';

-- Set one more for Chief approval to have multiple test cases
UPDATE job_requisitions 
SET hr_reviewed = true,
    chief_of_division_approval = null, 
    status = 'draft'
WHERE id = '9325bba7-2674-4678-bf59-2553dfb6bd16';