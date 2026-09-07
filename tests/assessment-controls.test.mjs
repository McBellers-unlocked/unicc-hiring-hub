import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ids = {
  hr: '00000000-0000-4000-8000-000000000001', manager: '00000000-0000-4000-8000-000000000002',
  panel: '00000000-0000-4000-8000-000000000003', candidate: '00000000-0000-4000-8000-000000000004',
  job: '00000000-0000-4000-8000-000000000011', otherJob: '00000000-0000-4000-8000-000000000012',
  app: '00000000-0000-4000-8000-000000000021', otherApp: '00000000-0000-4000-8000-000000000022',
  manualApp: '00000000-0000-4000-8000-000000000023', candidateRecord: '00000000-0000-4000-8000-000000000031',
  criterion: '00000000-0000-4000-8000-000000000041', otherCriterion: '00000000-0000-4000-8000-000000000042',
};

// A minimal isolated schema with the actual table/column types and access-helper
// behavior this additive migration depends on. No network or live Supabase data.
const fixture = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TYPE public.user_role AS ENUM ('Admin','HR Assistant','Chief of HR','Hiring Manager','Panel Member','Candidate');
  CREATE TYPE public.application_status AS ENUM ('Application','Screening','Longlist','Shortlist','Pre-Recorded Video','Panel Interview','Offer','Roster','Rejected');
  CREATE TABLE public.users(id uuid PRIMARY KEY, name text NOT NULL, role public.user_role NOT NULL);
  CREATE TABLE public.jobs(id uuid PRIMARY KEY, title text, essential_education_level text);
  CREATE TABLE public.candidates(id uuid PRIMARY KEY, phf_work_experience jsonb, work_experience jsonb, phf_education jsonb, education jsonb, motivation_letter text);
  CREATE TABLE public.applications(id uuid PRIMARY KEY, job_id uuid REFERENCES public.jobs(id), candidate_id uuid REFERENCES public.candidates(id), status public.application_status NOT NULL DEFAULT 'Application', suggested_for_longlist boolean DEFAULT false, longlist_rating text, answers jsonb, phf_data jsonb, phf_completed boolean DEFAULT true, submitted_at timestamptz DEFAULT now(), files jsonb);
  CREATE TABLE public.screening_scores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid REFERENCES public.applications(id), rubric_breakdown jsonb, ai_score numeric, version text, pipeline_version text, prompt_version text, model_version text, created_at timestamptz, UNIQUE(application_id,pipeline_version));
  CREATE TABLE public.batch_scoring_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid REFERENCES public.jobs(id),status text CHECK(status IN('pending','processing','completed','failed')));
  ALTER TABLE public.batch_scoring_jobs ENABLE ROW LEVEL SECURITY;
  CREATE TABLE public.stage_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid REFERENCES public.applications(id), from_stage public.application_status, to_stage public.application_status, by_user uuid REFERENCES public.users(id), reason text);
  CREATE TABLE public.job_interview_panel_members(job_id uuid REFERENCES public.jobs(id), user_id uuid REFERENCES public.users(id));
  CREATE TABLE public.job_review_committee_members(job_id uuid REFERENCES public.jobs(id), user_id uuid REFERENCES public.users(id));
  CREATE TABLE public.job_hiring_managers(job_id uuid REFERENCES public.jobs(id), user_id uuid REFERENCES public.users(id));
  CREATE TABLE public.job_requirements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid NOT NULL REFERENCES public.jobs(id), title text NOT NULL, description text, category text NOT NULL DEFAULT 'Essential Criteria', must_have boolean, params jsonb, validator text, weight integer NOT NULL DEFAULT 1, order_index integer, created_at timestamptz NOT NULL DEFAULT now());
  CREATE FUNCTION public.has_role(p_user uuid,p_role public.user_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.users WHERE id=p_user AND role=p_role) $$;
  CREATE FUNCTION public.is_job_hiring_manager(p_user uuid,p_job uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.job_hiring_managers WHERE job_id=p_job AND user_id=p_user) $$;
  GRANT USAGE ON SCHEMA public, auth TO authenticated,anon,service_role;
  GRANT SELECT,UPDATE ON public.applications, public.job_requirements TO authenticated;
  INSERT INTO public.users VALUES ('${ids.hr}','HR reviewer','HR Assistant'),('${ids.manager}','Assigned manager','Hiring Manager'),('${ids.panel}','Other panel reviewer','Panel Member'),('${ids.candidate}','Applicant','Candidate');
  INSERT INTO public.jobs VALUES ('${ids.job}','Example role',NULL),('${ids.otherJob}','Other role',NULL);
  INSERT INTO public.candidates VALUES ('${ids.candidateRecord}','[{"duties":"Worked on sample projects"}]','[]','[]','[]','Synthetic statement');
  INSERT INTO public.applications(id,job_id,candidate_id) VALUES ('${ids.app}','${ids.job}','${ids.candidateRecord}'),('${ids.otherApp}','${ids.otherJob}','${ids.candidateRecord}'),('${ids.manualApp}','${ids.job}','${ids.candidateRecord}');
  INSERT INTO public.job_hiring_managers VALUES ('${ids.job}','${ids.manager}');
  INSERT INTO public.job_interview_panel_members VALUES ('${ids.otherJob}','${ids.panel}');
  INSERT INTO public.job_requirements(id,job_id,title,description,category,must_have,params,order_index) VALUES
    ('${ids.criterion}','${ids.job}','Project experience','Experience delivering projects','Essential Experience',true,'{}',1),
    ('${ids.otherCriterion}','${ids.job}','Desirable skill','Experience coaching colleagues','Desirable Experience',false,'{}',2);
`;

test('assessment controls execute transactionally in isolated PostgreSQL', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(fixture);
  await db.exec(await readFile(new URL('../supabase/migrations/20260907120000_assessment_workspace_controls.sql', import.meta.url), 'utf8'));
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const as = async (user, fn) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec('SET ROLE authenticated');
    try { return await fn(); } finally { await db.exec('RESET ROLE'); }
  };
  const rawSnapshot = async app => (await query(`SELECT jsonb_build_object('jobId',a.job_id,'rawJobEducationLevel',j.essential_education_level,
    'rawApplicationSnapshot',jsonb_build_object('phf_data',a.phf_data,'answers',a.answers,'phf_completed',a.phf_completed,'submitted_at',a.submitted_at),
    'rawCriteriaSnapshot',COALESCE((SELECT jsonb_agg(to_jsonb(r) - ARRAY['created_at','job_id','policy_approval_event_id']) FROM job_requirements r WHERE r.job_id=a.job_id),'[]'::jsonb)) AS value FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1`, [app]))[0].value;
  const run = async (app = ids.app, criteria = [{ criterionId: ids.criterion, criterionText: 'Experience delivering projects', status: 'insufficient_evidence' }]) => {
    const rubric = { ...await rawSnapshot(app), allCriteria: criteria, sources: [{ id: 'source-1', kind: 'application', label: 'Synthetic source', text: '😀 Project delivery evidence' }] };
    return (await query("INSERT INTO assessment_runs(application_id,rubric_breakdown,pipeline_version,prompt_version,model_version) VALUES ($1,$2,'5.0','fixture','fixture') RETURNING id", [app, rubric]))[0].id;
  };
  const decide = (app, decision, reason, assessmentId) => query('SELECT record_application_decision($1,$2,$3,$4)', [app, decision, reason, assessmentId]);
  const sourceEvidence = [{ sourceId: 'source-1', startOffset: 3, endOffset: 19, quote: 'Project delivery' }];
  const review = (assessmentId, type, resolves = null, criterion = ids.criterion, evidence = sourceEvidence) => query("SELECT record_assessment_review($1,$2,$3,'supported','Source passage verified',$4,$5,$6) AS id", [ids.app, assessmentId, criterion, type, resolves, evidence]);
  let firstRun = await run();
  const otherRun = await run(ids.otherApp);

  await t.test('RLS exposes only staff/assigned-application histories, not candidates or anonymous users', async () => {
    assert.equal((await as(ids.hr, () => query('SELECT id FROM assessment_runs'))).length, 2);
    assert.equal((await as(ids.manager, () => query('SELECT id FROM assessment_runs'))).length, 1);
    assert.equal((await as(ids.panel, () => query('SELECT id FROM assessment_runs')))[0].id, otherRun);
    assert.equal((await as(ids.candidate, () => query('SELECT id FROM assessment_runs'))).length, 0);
    await db.exec('SET ROLE anon');
    await assert.rejects(query('SELECT id FROM assessment_runs'), /permission denied/);
    await db.exec('RESET ROLE');
  });
  await t.test('assessment runs are immutable and browser clients cannot insert them', async () => {
    await assert.rejects(query("UPDATE assessment_runs SET model_version='changed' WHERE id=$1", [firstRun]), /append-only/);
    await assert.rejects(query('DELETE FROM assessment_runs WHERE id=$1', [firstRun]), /append-only/);
    await assert.rejects(as(ids.hr, () => run()), /permission denied/);
  });
  await t.test('unauthorized users, blank rationale, wrong-app and missing known run are rejected without side effects', async () => {
    await assert.rejects(as(ids.manager, () => decide(ids.app, 'included', 'Reason', firstRun)), /Only HR/);
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'included', '   ', firstRun)), /rationale/);
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'included', 'Reason', otherRun)), /assessment for this application/);
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'included', 'Reason', null)), /AI assessment is available/);
    assert.equal((await query('SELECT status FROM applications WHERE id=$1', [ids.app]))[0].status, 'Application');
    assert.equal((await query('SELECT * FROM assessment_review_events')).length, 0);
  });
  await t.test('decision atomically records actor, rationale and stage without touching machine suggestion', async () => {
    await as(ids.hr, () => decide(ids.app, 'included', 'Employment evidence meets requirements', firstRun));
    const app = (await query('SELECT * FROM applications WHERE id=$1', [ids.app]))[0];
    assert.equal(app.status, 'Longlist'); assert.equal(app.suggested_for_longlist, false);
    const event = (await query('SELECT * FROM assessment_review_events WHERE id=$1', [app.human_decision_event_id]))[0];
    assert.equal(event.reviewer_id, ids.hr); assert.equal(event.assessment_run_id, firstRun);
    assert.equal(event.rationale, 'Employment evidence meets requirements');
    assert.equal((await query('SELECT * FROM stage_events WHERE application_id=$1', [ids.app]))[0].reason, event.rationale);
    await assert.rejects(query("UPDATE assessment_review_events SET rationale='rewrite' WHERE id=$1", [event.id]), /append-only/);
  });
  await t.test('direct early-stage writes cannot bypass decision rationale and run association', async () => {
    await assert.rejects(as(ids.hr, () => query("UPDATE applications SET status='Rejected' WHERE id=$1", [ids.app])), /Record this decision/);
    assert.equal((await query('SELECT status FROM applications WHERE id=$1', [ids.app]))[0].status, 'Longlist');
  });
  await t.test('failed stage logging rolls back decision and application update', async () => {
    await db.exec("CREATE FUNCTION fail_stage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fixture stage log failure'; END $$; CREATE TRIGGER fail_stage BEFORE INSERT ON stage_events FOR EACH ROW EXECUTE FUNCTION fail_stage();");
    const before = (await query('SELECT count(*)::int AS count FROM assessment_review_events'))[0].count;
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'excluded', 'Different evidence', firstRun)), /Fixture stage log failure/);
    assert.equal((await query('SELECT count(*)::int AS count FROM assessment_review_events'))[0].count, before);
    assert.equal((await query('SELECT status FROM applications WHERE id=$1', [ids.app]))[0].status, 'Longlist');
    await db.exec('DROP TRIGGER fail_stage ON stage_events; DROP FUNCTION fail_stage();');
  });
  await t.test('review corrections preserve original finding and cannot target unrelated criteria/applications', async () => {
    await as(ids.manager, () => review(firstRun, 'correction'));
    assert.equal((await query('SELECT rubric_breakdown FROM assessment_runs WHERE id=$1', [firstRun]))[0].rubric_breakdown.allCriteria[0].status, 'insufficient_evidence');
    await assert.rejects(as(ids.panel, () => review(firstRun, 'correction')), /not authorized/);
    await assert.rejects(as(ids.hr, () => review(firstRun, 'correction', null, 'made-up')), /criterion does not belong/);
  });
  await t.test('human findings require exact evidence, with correct UTF-16 astral-character offsets', async () => {
    await assert.rejects(as(ids.hr, () => review(firstRun, 'correction', null, ids.criterion, [])), /Select exact source evidence/);
    await assert.rejects(as(ids.hr, () => review(firstRun, 'correction', null, ids.criterion, [{ ...sourceEvidence[0], quote: 'Invented evidence' }])), /does not match/);
    await assert.rejects(as(ids.hr, () => review(firstRun, 'correction', null, ids.criterion, [{ sourceId:'source-1',startOffset:1,endOffset:2,quote:'😀' }])), /does not match/);
    assert.equal((await query('SELECT assessment_utf16_slice($1,0,2) AS value',['😀 Project']))[0].value,'😀');
    assert.equal((await query('SELECT assessment_utf16_slice($1,3,10) AS value',['😀 Project']))[0].value,'Project');
    assert.equal((await query('SELECT assessment_utf16_slice($1,1,2) AS value',['😀 Project']))[0].value,null);
    const event=(await as(ids.hr,()=>review(firstRun,'correction')))[0].id;
    assert.deepEqual((await query('SELECT evidence FROM assessment_review_events WHERE id=$1',[event]))[0].evidence,sourceEvidence);
  });
  await t.test('unresolved disagreements survive rescore and removed criteria; latest-run resolution unblocks decisions', async () => {
    const dispute = (await as(ids.manager, () => review(firstRun, 'disagreement')))[0].id;
    const nextRun = await run(ids.app, []);
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'excluded', 'Reason', firstRun)), /newer assessment/);
    await assert.rejects(as(ids.hr, () => decide(ids.app, 'excluded', 'Reason', nextRun)), /open reviewer disagreements/);
    await assert.rejects(as(ids.hr, () => review(firstRun, 'resolution', dispute)), /newer assessment/);
    await as(ids.manager, () => review(nextRun, 'resolution', dispute));
    await assert.rejects(as(ids.hr, () => review(nextRun, 'resolution', dispute)), /already been resolved/);
    await as(ids.hr, () => decide(ids.app, 'excluded', 'The earlier dispute is explicitly resolved', nextRun));
    firstRun = nextRun;
  });
  await t.test('human decisions work without AI by preserving a clearly marked immutable manual snapshot', async () => {
    await as(ids.hr, () => decide(ids.manualApp, 'included', 'Documents inspected directly by HR', null));
    const saved = (await query('SELECT * FROM assessment_runs WHERE application_id=$1', [ids.manualApp]))[0];
    assert.equal(saved.pipeline_version, 'manual-1'); assert.equal(saved.model_version, 'none');
    assert.equal(saved.rubric_breakdown.assessment_kind, 'manual'); assert.equal(saved.rubric_breakdown.assessment_status, 'unassessed');
    assert.equal(saved.rubric_breakdown.rawCriteriaSnapshot.length, 2);
    assert.equal(saved.rubric_breakdown.assessmentId,saved.id);
    assert.equal(saved.rubric_breakdown.sources[0].id,'submitted-application');
    assert.equal(saved.rubric_breakdown.candidate_input_snapshot,undefined);
    assert.equal((await query('SELECT assessment_run_id FROM assessment_review_events WHERE application_id=$1', [ids.manualApp]))[0].assessment_run_id, saved.id);
    await assert.rejects(as(ids.hr,()=>decide(ids.manualApp,'included','Reason',null)),error=>error.code==='40001' && /manual review snapshot is available/.test(error.message));
    await query("UPDATE applications SET answers=$2 WHERE id=$1",[ids.manualApp,{ clarification:'Additional submitted evidence' }]);
    const eventsBefore=(await query('SELECT count(*)::int AS count FROM assessment_review_events WHERE application_id=$1',[ids.manualApp]))[0].count;
    await assert.rejects(as(ids.hr,()=>decide(ids.manualApp,'needs_clarification','Reason',saved.id)),error=>error.code==='40001' && /Prepare and inspect a fresh manual/.test(error.message));
    assert.equal((await query('SELECT count(*)::int AS count FROM assessment_review_events WHERE application_id=$1',[ids.manualApp]))[0].count,eventsBefore);
    assert.equal((await query('SELECT count(*)::int AS count FROM assessment_runs WHERE application_id=$1',[ids.manualApp]))[0].count,1);
    await assert.rejects(as(ids.candidate,()=>query('SELECT prepare_manual_assessment_snapshot($1)',[ids.manualApp])),/not authorized/);
    const prepared=(await as(ids.manager,()=>query('SELECT prepare_manual_assessment_snapshot($1) AS id',[ids.manualApp])))[0].id;
    assert.equal((await as(ids.hr,()=>query('SELECT prepare_manual_assessment_snapshot($1) AS id',[ids.manualApp])))[0].id,prepared);
    await as(ids.hr,()=>decide(ids.manualApp,'needs_clarification','The newly supplied evidence needs checking',prepared));
    const manualRuns=await query('SELECT * FROM assessment_runs WHERE application_id=$1 ORDER BY created_at',[ids.manualApp]);
    assert.equal(manualRuns.length,2);
    assert.equal(manualRuns[0].rubric_breakdown.rawApplicationSnapshot.answers,null);
    assert.equal(manualRuns[1].rubric_breakdown.rawApplicationSnapshot.answers.clarification,'Additional submitted evidence');
  });

  const policies = async () => (await query('SELECT * FROM job_requirements WHERE job_id=$1 ORDER BY order_index', [ids.job])).map(r => ({
    id: r.id, classification: r.must_have ? 'essential' : 'desirable', assessment_mode: r.must_have ? 'gate' : 'weighted', assessment_weight: 1,
    expected: Object.fromEntries(['title','description','category','must_have','params','validator','weight','order_index','assessment_mode','assessment_weight'].map(key => [key,key==='assessment_weight'?Number(r[key]):r[key]])),
  }));
  const approve = payload => as(ids.hr, () => query("SELECT approve_assessment_policy($1,$2,'Role-specific gates and evidence weights')", [ids.job, payload]));
  await t.test('criterion approval is complete, authorized, version-checked and immutable', async () => {
    const payload = await policies();
    await assert.rejects(approve(payload.slice(0,1)), /criterion set changed/);
    await assert.rejects(as(ids.candidate, () => query("SELECT approve_assessment_policy($1,$2,'Reason')", [ids.job, payload])), /Only HR/);
    await approve(payload);
    assert.equal((await query('SELECT count(*)::int AS count FROM job_requirements WHERE policy_approved_at IS NOT NULL'))[0].count, 2);
    await assert.rejects(approve(payload), /criterion changed/);
    await assert.rejects(query("UPDATE job_assessment_policy_events SET rationale='rewrite'"), /append-only/);
  });
  await t.test('direct approval spoofing is rejected and edits invalidate every criterion approval', async () => {
    await assert.rejects(as(ids.hr, () => query('UPDATE job_requirements SET policy_approved_at=clock_timestamp() WHERE id=$1', [ids.criterion])), /Approve the complete/);
    await as(ids.hr, () => query("UPDATE job_requirements SET description='Changed requirement' WHERE id=$1", [ids.criterion]));
    assert.equal((await query('SELECT count(*)::int AS count FROM job_requirements WHERE policy_approved_at IS NOT NULL'))[0].count, 0);
    await approve(await policies());
    await query("INSERT INTO job_requirements(job_id,title,category,must_have) VALUES ($1,'New criterion','Essential Criteria',true)", [ids.job]);
    assert.equal((await query('SELECT count(*)::int AS count FROM job_requirements WHERE policy_approved_at IS NOT NULL'))[0].count, 0);
  });
  await t.test('changed policy or application inputs cannot reuse a stale AI assessment', async () => {
    await assert.rejects(as(ids.hr,()=>decide(ids.app,'included','Reason',firstRun)),/application or criterion policy changed/);
    firstRun=await run();
    await query("UPDATE applications SET answers='{" + '"newEvidence":true' + "}'::jsonb WHERE id=$1",[ids.app]);
    await assert.rejects(as(ids.hr,()=>decide(ids.app,'included','Reason',firstRun)),/application or criterion policy changed/);
  });
  await t.test('atomic service save validates inputs and keeps run/projection together on failure', async () => {
    const rubric={...await rawSnapshot(ids.app),allCriteria:[],sources:[]};
    await assert.rejects(as(ids.hr,()=>query("SELECT save_assessment_run($1,$2,'5.0','fixture','fixture')",[ids.app,rubric])),/permission denied/);
    await db.exec('SET ROLE service_role');
    const saved=(await query("SELECT save_assessment_run($1,$2,'5.0','fixture','fixture') AS id",[ids.app,rubric]))[0].id;
    await db.exec('RESET ROLE');
    assert.equal((await query('SELECT assessment_run_id FROM screening_scores WHERE application_id=$1',[ids.app]))[0].assessment_run_id,saved);
    assert.equal((await query('SELECT rubric_breakdown FROM assessment_runs WHERE id=$1',[saved]))[0].rubric_breakdown.assessmentId,saved);
    await db.exec("CREATE FUNCTION fail_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fixture projection failure'; END $$; CREATE TRIGGER fail_projection BEFORE INSERT OR UPDATE ON screening_scores FOR EACH ROW EXECUTE FUNCTION fail_projection();");
    const before=(await query('SELECT count(*)::int AS count FROM assessment_runs'))[0].count;
    await db.exec('SET ROLE service_role');
    await assert.rejects(query("SELECT save_assessment_run($1,$2,'5.0','fixture','fixture')",[ids.app,rubric]),/Fixture projection failure/);
    await db.exec('RESET ROLE');
    assert.equal((await query('SELECT count(*)::int AS count FROM assessment_runs'))[0].count,before);
    await db.exec('DROP TRIGGER fail_projection ON screening_scores; DROP FUNCTION fail_projection();');
  });
  await t.test('backend alone writes score/progress projections and incomplete batches are represented', async () => {
    await assert.rejects(as(ids.hr,()=>query("INSERT INTO screening_scores(application_id) VALUES($1)",[ids.app])),/permission denied/);
    await assert.rejects(as(ids.hr,()=>query("INSERT INTO batch_scoring_jobs(job_id,status) VALUES($1,'completed')",[ids.job])),/permission denied/);
    await db.exec('SET ROLE service_role');
    await query("INSERT INTO batch_scoring_jobs(job_id,status) VALUES($1,'incomplete')",[ids.job]);
    await db.exec('RESET ROLE');
    assert.equal((await as(ids.hr,()=>query('SELECT status FROM batch_scoring_jobs')))[0].status,'incomplete');
    assert.equal((await as(ids.candidate,()=>query('SELECT status FROM batch_scoring_jobs'))).length,0);
  });
  await t.test('unknown criterion categories require explicit classification before approval', async () => {
    await query("UPDATE job_requirements SET category='Overall Assessment',must_have=false WHERE id=$1",[ids.criterion]);
    const payload=await policies();
    payload[0].classification='';
    await assert.rejects(approve(payload),/Every criterion/);
    payload[0].classification='essential';
    await approve(payload);
    const updated=(await query('SELECT category,must_have FROM job_requirements WHERE id=$1',[ids.criterion]))[0];
    assert.equal(updated.category,'Essential Criteria'); assert.equal(updated.must_have,true);
  });
  await t.test('separate job education is structured idempotently and edits invalidate policy approval', async () => {
    await query("UPDATE jobs SET essential_education_level='First Level University' WHERE id=$1",[ids.job]);
    const added=(await as(ids.hr,()=>query('SELECT add_assessment_education_criterion($1) AS id',[ids.job])))[0].id;
    assert.equal((await as(ids.hr,()=>query('SELECT add_assessment_education_criterion($1) AS id',[ids.job])))[0].id,added);
    await approve(await policies());
    await query("UPDATE jobs SET essential_education_level='Advanced University' WHERE id=$1",[ids.job]);
    assert.equal((await query('SELECT description FROM job_requirements WHERE id=$1',[added]))[0].description,'Required education: Advanced University');
    assert.equal((await query('SELECT count(*)::int AS count FROM job_requirements WHERE policy_approved_at IS NOT NULL'))[0].count,0);
  });
  await t.test('incomplete applications cannot be persisted as AI-assessed but remain eligible for human review', async () => {
    await query('UPDATE applications SET phf_completed=false WHERE id=$1',[ids.app]);
    const rubric={...await rawSnapshot(ids.app),allCriteria:[],sources:[]};
    await db.exec('SET ROLE service_role');
    await assert.rejects(query("SELECT save_assessment_run($1,$2,'5.0','fixture','fixture')",[ids.app,rubric]),/submitted, completed/);
    await db.exec('RESET ROLE');
  });
});
