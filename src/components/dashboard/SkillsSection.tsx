import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, X } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface StudentSkill {
  skill_id: string;
  level: string;
}

const SkillsSection = ({ userId }: { userId?: string }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [studentSkills, setStudentSkills] = useState<StudentSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("beginner");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("skills").select("*").order("category").then(({ data }) => setSkills(data || []));
    if (userId) {
      supabase.from("student_skills").select("skill_id, level").eq("user_id", userId).then(({ data }) => setStudentSkills(data || []));
    }
  }, [userId]);

  const addSkill = async () => {
    if (!selectedSkill || !userId) return;
    const { error } = await supabase.from("student_skills").upsert({
      user_id: userId,
      skill_id: selectedSkill,
      level: selectedLevel as any,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setStudentSkills([...studentSkills.filter(s => s.skill_id !== selectedSkill), { skill_id: selectedSkill, level: selectedLevel }]);
      toast({ title: "Skill added!" });
      setSelectedSkill(null);
    }
  };

  const removeSkill = async (skillId: string) => {
    if (!userId) return;
    await supabase.from("student_skills").delete().eq("user_id", userId).eq("skill_id", skillId);
    setStudentSkills(studentSkills.filter(s => s.skill_id !== skillId));
    toast({ title: "Skill removed" });
  };

  const categories = [...new Set(skills.map(s => s.category))];
  const mySkillIds = studentSkills.map(s => s.skill_id);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-4">My Skills ({studentSkills.length})</h2>
        <div className="flex flex-wrap gap-2">
          {studentSkills.length === 0 ? (
            <p className="text-muted-foreground">No skills added yet. Add skills below!</p>
          ) : (
            studentSkills.map((ss) => {
              const skill = skills.find(s => s.id === ss.skill_id);
              return skill ? (
                <div key={ss.skill_id} className="skill-badge skill-badge-active flex items-center gap-2">
                  <span>{skill.name}</span>
                  <span className="text-xs opacity-70">({ss.level})</span>
                  <button onClick={() => removeSkill(ss.skill_id)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-4">Add Skills</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {["beginner", "intermediate", "advanced"].map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${
                selectedLevel === level ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{cat.replace("_", " ")}</h3>
            <div className="flex flex-wrap gap-2">
              {skills.filter(s => s.category === cat).map((skill) => {
                const isAdded = mySkillIds.includes(skill.id);
                const isSelected = selectedSkill === skill.id;
                return (
                  <button
                    key={skill.id}
                    onClick={() => !isAdded && setSelectedSkill(isSelected ? null : skill.id)}
                    disabled={isAdded}
                    className={`skill-badge transition-all ${isAdded ? "opacity-50 cursor-not-allowed" : ""} ${isSelected ? "skill-badge-active" : ""}`}
                  >
                    {isAdded && <Check className="w-3 h-3 mr-1" />}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {selectedSkill && (
          <Button onClick={addSkill} variant="hero" className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Add Selected Skill
          </Button>
        )}
      </div>
    </div>
  );
};

export default SkillsSection;
