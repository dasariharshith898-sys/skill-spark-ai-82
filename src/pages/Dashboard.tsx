import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, LogOut, Briefcase, Target, FileText, Bell, BookOpen, TrendingUp } from "lucide-react";
import SkillsSection from "@/components/dashboard/SkillsSection";
import JobsSection from "@/components/dashboard/JobsSection";
import ResumeAnalyzer from "@/components/dashboard/ResumeAnalyzer";
import ReadinessScore from "@/components/dashboard/ReadinessScore";
import AlertsSection from "@/components/dashboard/AlertsSection";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("skills");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/auth");
  };

  const tabs = [
    { id: "skills", label: "My Skills", icon: BookOpen },
    { id: "jobs", label: "Job Roles", icon: Briefcase },
    { id: "readiness", label: "Readiness", icon: Target },
    { id: "resume", label: "Resume ATS", icon: FileText },
    { id: "alerts", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-7 h-7 text-primary" />
            <span className="font-display text-xl font-bold text-gradient">SkillSync AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              Welcome, {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-muted/30 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {activeTab === "skills" && <SkillsSection userId={user?.id} />}
          {activeTab === "jobs" && <JobsSection />}
          {activeTab === "readiness" && <ReadinessScore userId={user?.id} />}
          {activeTab === "resume" && <ResumeAnalyzer userId={user?.id} />}
          {activeTab === "alerts" && <AlertsSection userId={user?.id} />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
