import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, IndianRupee, Clock, Building2 } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  experience_required: string;
  salary_range: string;
  location: string;
}

const JobsSection = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    supabase.from("job_roles").select("*").eq("is_active", true).then(({ data }) => setJobs(data || []));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <div key={job.id} className="glass-card p-5 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold text-foreground">{job.title}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Building2 className="w-3.5 h-3.5" />
                {job.company}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
              <Clock className="w-3 h-3" /> {job.experience_required}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
              <IndianRupee className="w-3 h-3" /> {job.salary_range}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
              <MapPin className="w-3 h-3" /> {job.location}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobsSection;
