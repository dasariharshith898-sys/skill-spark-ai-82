import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Target, FileText, TrendingUp, Brain, CheckCircle } from "lucide-react";

const Index = () => {
  const features = [
    { icon: Target, title: "Skill Assessment", desc: "Track and manage your technical skills" },
    { icon: Brain, title: "AI-Powered Analysis", desc: "Get intelligent career recommendations" },
    { icon: FileText, title: "Resume ATS Score", desc: "Analyze resume for job compatibility" },
    { icon: TrendingUp, title: "Readiness Scores", desc: "Know your job readiness instantly" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <header className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <span className="font-display text-2xl font-bold text-gradient">SkillSync AI</span>
        </div>
        <Link to="/auth">
          <Button variant="glow">Get Started</Button>
        </Link>
      </header>

      <main className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-slide-up">
            <span className="text-gradient">AI-Powered</span>
            <br />Career Readiness Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up stagger-1">
            Discover your skill gaps, analyze your resume with AI, and get personalized career recommendations for the Indian job market.
          </p>
          <Link to="/auth">
            <Button variant="hero" size="xl" className="animate-slide-up stagger-2">
              Start Your Journey <Zap className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {features.map((feature, i) => (
            <div key={i} className={`glass-card p-6 card-hover animate-slide-up stagger-${i + 2}`}>
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 glass-card p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold mb-6">Why SkillSync AI?</h2>
              <div className="space-y-4">
                {["Real-time skill gap analysis", "AI-powered resume scoring", "India-focused job matching", "Personalized learning paths"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-6 text-center">
              <div className="text-6xl font-display font-bold text-gradient mb-2">85%</div>
              <p className="text-muted-foreground">Average improvement in job readiness</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
