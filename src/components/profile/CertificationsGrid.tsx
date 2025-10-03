import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, CheckCircle2 } from "lucide-react";

interface CertificationsGridProps {
  certifications: any[];
}

export default function CertificationsGrid({ certifications }: CertificationsGridProps) {
  if (!certifications || certifications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications & Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-semibold">{cert.name || cert.title}</h4>
                  {cert.issuer && (
                    <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                  )}
                  {cert.date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{cert.date}</span>
                    </div>
                  )}
                  {cert.expiry && (
                    <Badge variant="outline" className="text-xs">
                      Expires: {cert.expiry}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
