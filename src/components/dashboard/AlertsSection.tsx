import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle, AlertTriangle, Lightbulb, Briefcase } from "lucide-react";

const AlertsSection = ({ userId }: { userId?: string }) => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      supabase.from("alerts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => setAlerts(data || []));
    }
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "job_eligible": return <Briefcase className="w-5 h-5 text-success" />;
      case "skill_gap": return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "recommendation": return <Lightbulb className="w-5 h-5 text-accent" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Alerts & Notifications
        </h2>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No alerts yet. Calculate your readiness scores to receive personalized alerts!</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => !alert.is_read && markAsRead(alert.id)}
                className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                  alert.is_read ? "bg-muted/30" : "bg-muted/60 border border-primary/20"
                }`}
              >
                {getIcon(alert.type)}
                <div className="flex-1">
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </div>
                {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsSection;
