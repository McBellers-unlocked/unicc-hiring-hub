import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Briefcase, GraduationCap, Globe, Award, Mail,
  Phone, FileUser, MessageSquare, UserPlus, ArrowLeft,
  Shield, Plane, Calendar, Download, Flag, ClipboardList,
  ExternalLink, Building2
} from "lucide-react";
import { CandidateNotes } from "./CandidateNotes";
import { CandidateFlags } from "./CandidateFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CandidateProfileSheetProps {
  candidate: any;
  open: boolean;
  onClose: () => void;
}

export function CandidateProfileSheet({ candidate, open, onClose }: CandidateProfileSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const initials = (candidate?.name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Fetch open jobs for "Add to Pipeline"
  const { data: openJobs } = useQuery({
    queryKey: ["open-jobs-for-pipeline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, department")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: open,
  });

  // Add to pipeline mutation
  const addToPipeline = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("applications").insert([{
        candidate_id: candidate.id,
        job_id: jobId,
        status: "new" as any,
        source: "talent_pool",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Added to pipeline", description: `${candidate.name} has been added to the job pipeline.` });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setSelectedJobId("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message?.includes("duplicate") ? "Candidate already in this pipeline." : err.message, variant: "destructive" });
    },
  });

  const handleExportProfile = () => {
    const lines = [
      `Name: ${candidate.name}`,
      `Position: ${candidate.current_position || "N/A"}`,
      `Organization: ${candidate.current_organization || "N/A"}`,
      `Location: ${candidate.location || "N/A"}`,
      `Email: ${candidate.email || "N/A"}`,
      `Experience: ${candidate.years_of_experience || 0} years`,
      "",
      "--- Professional Summary ---",
      candidate.professional_summary || "N/A",
      "",
      "--- Skills ---",
      ...(Array.isArray(candidate.skills) ? candidate.skills.map((s: any) => `• ${typeof s === "string" ? s : s.name}`) : ["N/A"]),
      "",
      "--- Work Experience ---",
      ...(Array.isArray(candidate.work_experience)
        ? candidate.work_experience.map((e: any) => `• ${e.title || e.position} at ${e.company || e.organization} (${e.start_date || "?"} – ${e.end_date || "Present"})`)
        : ["N/A"]),
      "",
      "--- Education ---",
      ...(Array.isArray(candidate.education)
        ? candidate.education.map((e: any) => `• ${e.degree || e.level} – ${e.institution || e.school} (${e.year || e.end_date || ""})`)
        : ["N/A"]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${candidate.name.replace(/\s+/g, "_")}_profile.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Profile exported" });
  };

  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const workExperience = Array.isArray(candidate.work_experience) ? candidate.work_experience : [];
  const education = Array.isArray(candidate.education) ? candidate.education : [];
  const languages = Array.isArray(candidate.languages) ? candidate.languages : [];
  const certifications = Array.isArray(candidate.certifications) ? candidate.certifications : [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-muted/30">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </button>

          <SheetHeader className="text-left">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                <AvatarImage src={candidate.profile_photo_url} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl">{candidate.name}</SheetTitle>
                <p className="text-muted-foreground mt-1">
                  {candidate.current_position || candidate.position || "No title"}
                  {(candidate.current_organization || candidate.organization) &&
                    ` at ${candidate.current_organization || candidate.organization}`}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {candidate.location}
                    </span>
                  )}
                  {candidate.years_of_experience != null && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {candidate.years_of_experience} yrs exp
                    </span>
                  )}
                  {candidate.gender && (
                    <span>{candidate.gender}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                    <Globe className="h-3 w-3 mr-1" />
                    External
                  </Badge>
                  {candidate.un_experience && (
                    <Badge variant="outline" className="gap-1">
                      <Award className="h-3 w-3" />
                      UN Experience
                    </Badge>
                  )}
                  {candidate.has_security_clearance && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Security Clearance
                    </Badge>
                  )}
                  {candidate.willing_to_relocate && (
                    <Badge variant="outline" className="gap-1">
                      <Plane className="h-3 w-3" />
                      Open to Relocation
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 rounded-none border-b px-6 h-auto py-0 bg-transparent">
            {["about", "experience", "skills", "notes", "actions"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* ABOUT TAB */}
              <TabsContent value="about" className="mt-0 space-y-6">
                {candidate.professional_summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Professional Summary</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{candidate.professional_summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Contact</h3>
                    {candidate.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${candidate.email}`} className="text-primary hover:underline truncate">{candidate.email}</a>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                    {candidate.linkedin_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">LinkedIn Profile</a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Details</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.years_of_experience || 0} years experience</span>
                    </div>
                    {candidate.present_nationality && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{candidate.present_nationality}</span>
                      </div>
                    )}
                    {candidate.availability_status && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{candidate.availability_status}</span>
                      </div>
                    )}
                  </div>
                </div>

                {languages.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {languages.map((lang: any, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {typeof lang === "string" ? lang : `${lang.language} (${lang.proficiency || "—"})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {education.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education Summary
                      </h3>
                      <div className="space-y-2">
                        {education.slice(0, 3).map((edu: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{edu.degree || edu.level}</span>
                            {(edu.institution || edu.school) && (
                              <span className="text-muted-foreground"> — {edu.institution || edu.school}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* EXPERIENCE TAB */}
              <TabsContent value="experience" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Work Experience
                  </h3>
                  {workExperience.length > 0 ? (
                    <div className="space-y-1">
                      {workExperience.map((exp: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-primary pl-4 pb-5 relative">
                          <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                          <h4 className="font-semibold">{exp.title || exp.position}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {exp.company || exp.organization}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {exp.start_date} – {exp.end_date || "Present"}
                          </p>
                          {exp.description && (
                            <p className="text-sm mt-2 text-muted-foreground">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No work experience listed</p>
                  )}
                </div>

                {education.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education
                      </h3>
                      <div className="space-y-1">
                        {education.map((edu: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary pl-4 pb-5 relative">
                            <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                            <h4 className="font-semibold">{edu.degree || edu.level}</h4>
                            <p className="text-sm text-muted-foreground">{edu.institution || edu.school}</p>
                            {(edu.year || edu.end_date) && (
                              <p className="text-xs text-muted-foreground">{edu.year || edu.end_date}</p>
                            )}
                            {edu.field_of_study && (
                              <p className="text-sm text-muted-foreground mt-1">{edu.field_of_study}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* SKILLS TAB */}
              <TabsContent value="skills" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Skills</h3>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                          {typeof skill === "string" ? skill : skill.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills listed</p>
                  )}
                </div>

                {certifications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Certifications
                      </h3>
                      <div className="space-y-3">
                        {certifications.map((cert: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <Award className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">{typeof cert === "string" ? cert : cert.name || cert.title}</p>
                              {cert.issuer && <p className="text-muted-foreground">{cert.issuer}</p>}
                              {cert.year && <p className="text-xs text-muted-foreground">{cert.year}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* NOTES TAB */}
              <TabsContent value="notes" className="mt-0 space-y-6">
                <CandidateNotes candidateId={candidate.id} />
              </TabsContent>

              {/* ACTIONS TAB */}
              <TabsContent value="actions" className="mt-0 space-y-6">
                <CandidateFlags candidateId={candidate.id} />

                <Separator />

                {/* Add to Pipeline */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add to Pipeline
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select an open job requisition to add this candidate as an applicant.
                  </p>
                  <div className="flex gap-2">
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a job…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(openJobs || []).map((job: any) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}{job.department ? ` (${job.department})` : ""}
                          </SelectItem>
                        ))}
                        {(!openJobs || openJobs.length === 0) && (
                          <SelectItem value="_none" disabled>No open positions</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => selectedJobId && addToPipeline.mutate(selectedJobId)}
                      disabled={!selectedJobId || addToPipeline.isPending}
                    >
                      {addToPipeline.isPending ? "Adding…" : "Add"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div>
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {candidate.email && (
                      <Button
                        variant="outline"
                        className="justify-start gap-2"
                        onClick={() => window.open(`mailto:${candidate.email}`, "_blank")}
                      >
                        <Mail className="h-4 w-4" />
                        Send Email
                      </Button>
                    )}
                    <Button variant="outline" className="justify-start gap-2" onClick={handleExportProfile}>
                      <Download className="h-4 w-4" />
                      Export Profile
                    </Button>
                    {candidate.linkedin_url && (
                      <Button
                        variant="outline"
                        className="justify-start gap-2"
                        onClick={() => window.open(candidate.linkedin_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View LinkedIn
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
