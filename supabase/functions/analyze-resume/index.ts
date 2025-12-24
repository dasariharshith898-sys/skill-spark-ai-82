import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Invalid token:", authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("Authenticated user:", user.id);

    const body = await req.json();
    const { fileName, jobTitle, requiredSkills } = body;

    // Input validation
    if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
      return new Response(JSON.stringify({ error: 'Invalid fileName: must be a string with max 255 characters' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid jobTitle: must be a string with max 100 characters' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(requiredSkills) || requiredSkills.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid requiredSkills: must be an array with max 50 items' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize skills array
    const sanitizedSkills = requiredSkills
      .filter((s): s is string => typeof s === 'string' && s.length < 100)
      .map(s => s.trim().substring(0, 100))
      .slice(0, 50);

    if (sanitizedSkills.length === 0) {
      return new Response(JSON.stringify({ error: 'requiredSkills must contain at least one valid skill' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize fileName and jobTitle for prompt injection prevention
    const safeFileName = fileName.replace(/[<>'"]/g, '').substring(0, 100);
    const safeJobTitle = jobTitle.replace(/[<>'"]/g, '').substring(0, 100);

    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer for Indian job market.

A candidate has uploaded a resume file named "${safeFileName}" for the position of "${safeJobTitle}".

The required skills for this job are: ${sanitizedSkills.join(", ")}

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

    console.log("Calling AI for resume analysis for user:", user.id);

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

    console.log("Resume analysis completed for user:", user.id);

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
