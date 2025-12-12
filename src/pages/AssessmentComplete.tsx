import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function AssessmentComplete() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Assessment Submitted!</CardTitle>
          <CardDescription>
            Thank you for completing the written assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg text-left">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Your responses have been saved and submitted</li>
              <li>• The hiring team will review your assessment</li>
              <li>• You will be contacted regarding next steps</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            You can now close this window. Thank you for your time and effort!
          </p>

          <Link to="/">
            <Button variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
