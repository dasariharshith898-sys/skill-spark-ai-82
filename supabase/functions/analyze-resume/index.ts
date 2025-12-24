import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, jobTitle, requiredSkills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer for Indian job market.

A candidate has uploaded a resume file named "${fileName}" for the position of "${jobTitle}".

The required skills for this job are: ${requiredSkills.join(", ")}

Based on common resume patterns and the file name, provide a realistic ATS analysis. Generate:
1. An ATS score between 40-85 (be realistic based on typical fresher resumes)
2. A list of likely matched skills from the required skills
3. A list of missing skills they should add
4. Practical suggestions for improving their resume

Respond in this exact JSON format:
{
  "atsScore": 65,
  "extractedSkills": ["Python", "SQL", "Git"],
  "matchedSkills": ["Python", "SQL"],
  "missingSkills": ["Machine Learning", "TensorFlow"],
  "suggestions": "Your resume shows strong foundational skills. To improve your ATS score: 1) Add specific project examples with quantifiable results, 2) Include relevant certifications, 3) Use keywords from the job description, 4) Add a clear skills section at the top."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert ATS analyzer. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in analyze-resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
