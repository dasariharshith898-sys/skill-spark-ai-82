import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const ReadinessScore = ({ userId }: { userId?: string }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("job_roles").select("id, title, company").eq("is_active", true).then(({ data }) => setJobs(data || []));
    if (userId) {
      supabase.from("readiness_scores").select("*").eq("user_id", userId).then(({ data }) => setScores(data || []));
    }
  }, [userId]);

  const calculateReadiness = async (jobId: string) => {
    if (!userId) return;
    setCalculating(true);
    try {
      const { data: studentSkills } = await supabase.from("student_skills").select("skill_id, level").eq("user_id", userId);
      const { data: jobSkills } = await supabase.from("job_skills").select("skill_id, required_level, weight, is_mandatory").eq("job_id", jobId);
      const { data: allSkills } = await supabase.from("skills").select("id, name");

      if (!jobSkills?.length) {
        toast({ title: "No skills defined for this job", variant: "destructive" });
        setCalculating(false);
        return;
      }

      const levelWeight = { beginner: 0.4, intermediate: 0.7, advanced: 1.0 };
      let totalWeight = 0, matchScore = 0;
      const missing: string[] = [], weak: string[] = [], strong: string[] = [];

      jobSkills.forEach((js) => {
        const skill = allSkills?.find(s => s.id === js.skill_id);
        const studentSkill = studentSkills?.find(ss => ss.skill_id === js.skill_id);
        const weight = Number(js.weight) || 1;
        totalWeight += weight;

        if (!studentSkill) {
          if (skill) missing.push(skill.name);
        } else {
          const studentLevel = levelWeight[studentSkill.level as keyof typeof levelWeight] || 0;
          const requiredLevel = levelWeight[js.required_level as keyof typeof levelWeight] || 0;
          if (studentLevel >= requiredLevel) {
            strong.push(skill?.name || "");
            matchScore += weight;
          } else {
            weak.push(skill?.name || "");
            matchScore += weight * (studentLevel / requiredLevel);
          }
        }
      });

      const score = Math.round((matchScore / totalWeight) * 100);
      const status = score >= 70 ? "job_ready" : score >= 40 ? "partially_ready" : "not_ready";

      await supabase.from("readiness_scores").upsert({
        user_id: userId,
        job_id: jobId,
        score,
        status,
        missing_skills: missing,
        weak_skills: weak,
        strong_skills: strong,
      });

      setScores([...scores.filter(s => s.job_id !== jobId), { job_id: jobId, score, status, missing_skills: missing, weak_skills: weak, strong_skills: strong }]);
      toast({ title: `Readiness Score: ${score}%` });
    } catch (e: any) {
      toast({ title: "Error calculating", description: e.message, variant: "destructive" });
    }
    setCalculating(false);
  };

  const getStatusColor = (status: string) => {
    if (status === "job_ready") return "text-success";
    if (status === "partially_ready") return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Job Readiness Calculator
        </h2>
        <p className="text-muted-foreground mb-4">Select a job to calculate your readiness score based on your skills.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => {
          const score = scores.find(s => s.job_id === job.id);
          return (
            <div key={job.id} className="glass-card p-5 card-hover">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                {score && (
                  <div className={`text-2xl font-display font-bold ${getStatusColor(score.status)}`}>
                    {score.score}%
                  </div>
                )}
              </div>
              {score ? (
                <div className="space-y-2">
                  <div className="score-meter">
                    <div className="score-meter-fill" style={{ width: `${score.score}%` }} />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {score.status === "job_ready" && <CheckCircle className="w-4 h-4 text-success" />}
                    {score.status === "partially_ready" && <TrendingUp className="w-4 h-4 text-warning" />}
                    {score.status === "not_ready" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    <span className={getStatusColor(score.status)}>{score.status.replace("_", " ")}</span>
                  </div>
                  {score.missing_skills?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Missing: {score.missing_skills.slice(0, 3).join(", ")}</p>
                  )}
                </div>
              ) : (
                <Button onClick={() => calculateReadiness(job.id)} variant="outline" size="sm" disabled={calculating}>
                  Calculate Readiness
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReadinessScore;
