import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Award } from "lucide-react";

interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  description?: string;
}

interface CertificationSectionProps {
  certifications: Certification[];
  onChange: (certifications: Certification[]) => void;
}

export default function CertificationSection({ certifications, onChange }: CertificationSectionProps) {
  const [newCert, setNewCert] = useState<Certification>({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
    description: "",
  });

  const addCertification = () => {
    if (newCert.name && newCert.issuer) {
      onChange([...certifications, newCert]);
      setNewCert({
        name: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
        description: "",
      });
    }
  };

  const removeCertification = (index: number) => {
    onChange(certifications.filter((_, i) => i !== index));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    const updated = certifications.map((cert, i) => 
      i === index ? { ...cert, [field]: value } : cert
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications & Licenses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Certifications */}
        {certifications.map((cert, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{cert.name}</h4>
                <p className="text-sm text-muted-foreground">{cert.issuer}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCertification(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Certification Name</Label>
                <Input
                  value={cert.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                />
              </div>
              <div>
                <Label>Issuing Organization</Label>
                <Input
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input
                  type="month"
                  value={cert.issueDate}
                  onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
                />
              </div>
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="month"
                  value={cert.expiryDate || ""}
                  onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Credential ID/URL (optional)</Label>
                <Input
                  value={cert.credentialId || ""}
                  onChange={(e) => updateCertification(index, 'credentialId', e.target.value)}
                  placeholder="Certificate number or verification URL"
                />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={cert.description || ""}
                onChange={(e) => updateCertification(index, 'description', e.target.value)}
                placeholder="Brief description of the certification..."
                rows={2}
              />
            </div>
          </div>
        ))}

        {/* Add New Certification */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-muted-foreground">Add Certification</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Certification Name *</Label>
              <Input
                value={newCert.name}
                onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                placeholder="PMP, AWS Solutions Architect, etc."
              />
            </div>
            <div>
              <Label>Issuing Organization *</Label>
              <Input
                value={newCert.issuer}
                onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                placeholder="PMI, Amazon, Microsoft, etc."
              />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input
                type="month"
                value={newCert.issueDate}
                onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiry Date (optional)</Label>
              <Input
                type="month"
                value={newCert.expiryDate}
                onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Credential ID/URL</Label>
              <Input
                value={newCert.credentialId}
                onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                placeholder="Certificate number or verification URL"
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newCert.description}
              onChange={(e) => setNewCert({ ...newCert, description: e.target.value })}
              placeholder="Brief description of the certification..."
              rows={2}
            />
          </div>
          <Button onClick={addCertification} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Certification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
