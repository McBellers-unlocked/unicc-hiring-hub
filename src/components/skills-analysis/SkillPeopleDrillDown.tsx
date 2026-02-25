import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Sparkles, CheckCircle2, Clock, TrendingUp, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  skillId?: string;
  category?: string;
  lifecycleStage?: "Established" | "Emerging" | "New" | "Legacy" | string;
}

interface StaffProfile {
  id: number;
  name: string;
  division: string;
  dutyStation: string;
  proficiency: number;
  lastAssessed: Date;
}

const NAMES = [
  "Fatima Al-Hassan", "Kenji Tanaka", "Priya Sharma", "Carlos Gutierrez", "Amara Diallo",
  "Olga Petrov", "Wei Chen", "Maria Santos", "Ibrahim Koné", "Yuki Nakamura",
  "Aisha Mohammed", "Dmitri Volkov", "Lucia Fernández", "Raj Patel", "Ngozi Okafor",
  "Elena Vasileva", "Ahmed Said", "Hana Kim", "Juan Morales", "Sofia Andersen",
  "Moussa Traoré", "Leila Benali", "Takeshi Yamamoto", "Clara Osei", "Andrei Popescu",
  "Mariam Touré", "Hiroshi Sato", "Valentina Rossi", "Kwame Asante", "Nadia Kowalski",
  "Omar Farooq", "Ingrid Larsen", "Chidi Eze", "Ayumi Watanabe", "Pierre Dubois",
  "Zainab Hussain", "Viktor Novák", "Amina Yusuf", "Luca Bianchi", "Mei-Ling Wu",
  "Hassan Abdallah", "Svetlana Kuznetsova", "Pedro Álvarez", "Fumiko Ito", "Grace Nyambura",
  "Mikhail Sorokin", "Fatoumata Camara", "Ravi Krishnan", "Anna Müller", "David Ochieng",
  "Layla Abbas", "Tomasz Nowak", "Chioma Nwosu", "Sanjay Gupta", "Brigitte Fontaine",
  "Youssef El-Amin", "Kaori Suzuki", "Esther Mensah", "Alejandro Ruiz", "Nina Johansson",
  "Abdoulaye Diop", "Tatiana Ivanova", "Marco De Luca", "Sunita Devi", "François Lemaire",
  "Halima Osman", "Jan Kowalczyk", "Akiko Mori", "Emmanuel Mensah", "Cristina Popescu",
  "Rashid Al-Maktoum", "Emiko Taniguchi", "Blessing Okoro", "Vikram Singh", "Cécile Martin",
  "Mustafa Kaya", "Sakura Hayashi", "Ama Adjei", "Jorge Hernández", "Katarina Novak",
  "Oumar Bah", "Mitsuki Abe", "Folake Adeyemi", "Ramesh Iyer", "Isabelle Laurent",
  "Tariq Mahmoud", "Haruka Kimura", "Nneka Igwe", "Mateo García", "Astrid Bergström",
  "Boubacar Sow", "Naoko Fujita", "Kofi Mensah", "Arjun Reddy", "Monique Dupont",
  "Salim Nasser", "Rina Kobayashi", "Adama Coulibaly", "Deepak Chopra", "Hélène Bernard",
];

const DIVISIONS = ["CS", "DD", "DO", "DS", "MS", "OP"];
const DUTY_STATIONS = ["Valencia", "Geneva", "New York", "Brindisi", "Rome"];
const PROFICIENCY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];
const PROFICIENCY_COLORS: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  3: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  4: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const LIFECYCLE_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  Established: { color: "bg-chart-1/15 text-chart-1 border-chart-1/30", icon: CheckCircle2 },
  Emerging: { color: "bg-chart-2/15 text-chart-2 border-chart-2/30", icon: TrendingUp },
  New: { color: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: Sparkles },
  Legacy: { color: "bg-chart-4/15 text-chart-4 border-chart-4/30", icon: Clock },
};

// Deterministic seeded random
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

function generateStaffForSkill(skillName: string): { staff: StaffProfile[]; nearMatch: StaffProfile[] } {
  const rand = seededRandom(skillName);
  const now = Date.now();

  // Generate all 100 profiles deterministically
  const allProfiles: StaffProfile[] = NAMES.map((name, i) => ({
    id: i,
    name,
    division: DIVISIONS[Math.floor(rand() * DIVISIONS.length)],
    dutyStation: DUTY_STATIONS[Math.floor(rand() * DUTY_STATIONS.length)],
    proficiency: Math.floor(rand() * 4) + 1,
    lastAssessed: new Date(now - Math.floor(rand() * 365 * 24 * 60 * 60 * 1000)),
  }));

  // Pick ~20-40 as having the skill
  const staffCount = Math.floor(rand() * 21) + 20;
  const shuffled = [...allProfiles].sort(() => rand() - 0.5);
  const staff = shuffled.slice(0, staffCount);

  // Pick ~8-15 as near-match from remainder
  const nearMatchCount = Math.floor(rand() * 8) + 8;
  const nearMatch = shuffled.slice(staffCount, staffCount + nearMatchCount);

  return { staff, nearMatch };
}

export default function SkillPeopleDrillDown({ open, onOpenChange, skillName, category, lifecycleStage }: Props) {
  const [recommended, setRecommended] = useState<Set<number>>(new Set());

  const { staff, nearMatch } = useMemo(() => generateStaffForSkill(skillName), [skillName]);

  const requiredLevel = useMemo(() => {
    const rand = seededRandom(skillName + "_req");
    return Math.floor(rand() * 2) + 3; // 3 or 4
  }, [skillName]);

  const stage = lifecycleStage
    ? lifecycleStage.charAt(0).toUpperCase() + lifecycleStage.slice(1).toLowerCase()
    : "Established";
  const stageConfig = LIFECYCLE_CONFIG[stage] || LIFECYCLE_CONFIG.Established;
  const StageIcon = stageConfig.icon;

  const handleRecommend = (id: number, name: string) => {
    setRecommended(prev => new Set(prev).add(id));
    toast.success(`${name} recommended for development in "${skillName}"`);
  };

  const formatDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const getGapInfo = (proficiency: number) => {
    const gap = requiredLevel - proficiency;
    if (gap <= 0) return { label: "Meets requirement", className: "text-green-700 dark:text-green-400" };
    if (gap === 1) return { label: "1 level below", className: "text-amber-700 dark:text-amber-400" };
    return { label: `${gap} levels below`, className: "text-destructive" };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-xl">{skillName}</SheetTitle>
            {category && <Badge variant="outline" className="text-xs">{category}</Badge>}
            <Badge variant="outline" className={`text-xs gap-1 ${stageConfig.color}`}>
              <StageIcon className="h-3 w-3" />
              {stage}
            </Badge>
          </div>
          <SheetDescription>People with this skill and development candidates</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{staff.length}</p>
              <p className="text-xs text-muted-foreground">Staff with skill</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{staff.length + Math.floor(staff.length * 0.4)}</p>
              <p className="text-xs text-muted-foreground">Required</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">
                {(staff.reduce((s, p) => s + p.proficiency, 0) / staff.length).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Proficiency</p>
            </div>
          </div>

          {/* People Table */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff ({staff.length})
            </h4>
            <ScrollArea className="h-[320px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Division</TableHead>
                    <TableHead className="text-xs">Duty Station</TableHead>
                    <TableHead className="text-xs">Proficiency</TableHead>
                    <TableHead className="text-xs">Gap</TableHead>
                    <TableHead className="text-xs">Last Assessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((person) => {
                    const gap = getGapInfo(person.proficiency);
                    return (
                      <TableRow key={person.id}>
                        <TableCell className="text-sm font-medium py-2">{person.name}</TableCell>
                        <TableCell className="text-sm py-2">{person.division}</TableCell>
                        <TableCell className="text-sm py-2">{person.dutyStation}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-xs ${PROFICIENCY_COLORS[person.proficiency]}`}>
                            {PROFICIENCY_LABELS[person.proficiency]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={`text-xs font-medium ${gap.className}`}>{gap.label}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">
                          {formatDate(person.lastAssessed)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <Separator />

          {/* Near Match Section */}
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Near Match — Development Candidates ({nearMatch.length})
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Staff with related skills who could be developed into this area
            </p>
            <ScrollArea className="h-[220px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Division</TableHead>
                    <TableHead className="text-xs">Duty Station</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nearMatch.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="text-sm font-medium py-2">{person.name}</TableCell>
                      <TableCell className="text-sm py-2">{person.division}</TableCell>
                      <TableCell className="text-sm py-2">{person.dutyStation}</TableCell>
                      <TableCell className="text-right py-2">
                        {recommended.has(person.id) ? (
                          <Badge variant="outline" className="text-xs text-green-700 dark:text-green-400">
                            Recommended
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleRecommend(person.id, person.name)}
                          >
                            Recommend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
