import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const ResumeAnalyzer = ({ userId }: { userId?: string }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("job_roles").select("id, title").eq("is_active", true).then(({ data }) => setJobs(data || []));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const analyzeResume = async () => {
    if (!file || !selectedJob || !userId) {
      toast({ title: "Please select a file and job role", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      // Upload file
      const filePath = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get job skills
      const { data: jobSkills } = await supabase
        .from("job_skills")
        .select("skills(name), required_level, is_mandatory")
        .eq("job_id", selectedJob);

      const requiredSkills = jobSkills?.map((js: any) => js.skills?.name).filter(Boolean) || [];
      const job = jobs.find(j => j.id === selectedJob);

      // Call AI for analysis
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { 
          fileName: file.name, 
          jobTitle: job?.title,
          requiredSkills 
        }
      });

      if (error) throw error;

      const analysisResult = data;
      setResult(analysisResult);

      // Save to database
      await supabase.from("resumes").insert({
        user_id: userId,
        file_name: file.name,
        file_url: filePath,
        target_job_id: selectedJob,
        ats_score: analysisResult.atsScore,
        extracted_skills: analysisResult.extractedSkills,
        analysis_result: analysisResult
      });

      toast({ title: "Analysis complete!", description: `ATS Score: ${analysisResult.atsScore}%` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 76) return "text-success";
    if (score >= 51) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 76) return <CheckCircle className="w-8 h-8 text-success" />;
    if (score >= 51) return <AlertTriangle className="w-8 h-8 text-warning" />;
    return <XCircle className="w-8 h-8 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Resume Analyzer & ATS Score
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Job Role</label>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-input/50 px-4 text-foreground"
            >
              <option value="">Select a job role...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Upload Resume (PDF/DOCX)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Click to upload your resume</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF or DOCX, max 10MB</p>
                </div>
              )}
            </div>
          </div>

          <Button onClick={analyzeResume} variant="hero" size="lg" className="w-full" disabled={analyzing || !file || !selectedJob}>
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-bold">Analysis Results</h3>
            <div className="flex items-center gap-3">
              {getScoreIcon(result.atsScore)}
              <div className={`text-4xl font-display font-bold ${getScoreColor(result.atsScore)}`}>
                {result.atsScore}%
              </div>
            </div>
          </div>

          <div className="score-meter mb-6">
            <div className="score-meter-fill" style={{ width: `${result.atsScore}%` }} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-success mb-2">Matched Skills</h4>
              <div className="flex flex-wrap gap-1">
                {result.matchedSkills?.map((skill: string) => (
                  <span key={skill} className="px-2 py-1 text-xs bg-success/20 text-success rounded">{skill}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-destructive mb-2">Missing Skills</h4>
              <div className="flex flex-wrap gap-1">
                {result.missingSkills?.map((skill: string) => (
                  <span key={skill} className="px-2 py-1 text-xs bg-destructive/20 text-destructive rounded">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          {result.suggestions && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">AI Suggestions</h4>
              <p className="text-sm text-muted-foreground">{result.suggestions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
