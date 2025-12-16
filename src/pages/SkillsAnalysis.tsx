import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import MySkillsAssessment from "@/components/skills-analysis/MySkillsAssessment";
import TeamSkillsTable from "@/components/skills-analysis/TeamSkillsTable";
import TeamSkillsAnalytics from "@/components/skills-analysis/TeamSkillsAnalytics";
import SkillsPortfolioAnalytics from "@/components/skills-analysis/SkillsPortfolioAnalytics";
import { BarChart3, Users, User, Building2 } from "lucide-react";

export default function SkillsAnalysis() {
  const { userRoles } = useAuth();
  const [activeTab, setActiveTab] = useState("my-skills");

  const isManager = userRoles.some(r => 
    ['Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director'].includes(r)
  );

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Skills Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Assess, track, and manage skills across your organization
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="my-skills" className="gap-2">
              <User className="h-4 w-4" />
              My Skills
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                Team Skills
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="organization" className="gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-skills">
            <MySkillsAssessment />
          </TabsContent>

          {isManager && (
            <TabsContent value="team">
              <TeamSkillsTable />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="analytics">
              <TeamSkillsAnalytics />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="organization">
              <SkillsPortfolioAnalytics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
