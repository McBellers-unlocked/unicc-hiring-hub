import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import MySkillsAssessment from "@/components/skills-analysis/MySkillsAssessment";
import TeamSkillsTable from "@/components/skills-analysis/TeamSkillsTable";
import { BarChart3, Users, User, Settings } from "lucide-react";

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
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm mt-2">View skill gaps, trends, and training recommendations</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
