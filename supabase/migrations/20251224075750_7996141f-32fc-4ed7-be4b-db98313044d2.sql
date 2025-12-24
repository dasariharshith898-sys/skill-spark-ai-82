-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  college TEXT,
  role app_role DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create skill categories enum
CREATE TYPE public.skill_category AS ENUM (
  'programming',
  'data_science',
  'web_development',
  'mobile_development',
  'cloud_computing',
  'database',
  'devops',
  'ai_ml',
  'soft_skills',
  'tools'
);

-- Create skill level enum
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create skills master table
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category skill_category NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create job_roles table
CREATE TABLE public.job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT,
  description TEXT,
  experience_required TEXT DEFAULT 'Fresher',
  salary_range TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create job_skills junction table (skills required for jobs)
CREATE TABLE public.job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.job_roles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  required_level skill_level NOT NULL DEFAULT 'intermediate',
  is_mandatory BOOLEAN DEFAULT true,
  weight DECIMAL(3,2) DEFAULT 1.0,
  UNIQUE(job_id, skill_id)
);

-- Create student_skills table
CREATE TABLE public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  source TEXT,
  last_used DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create readiness_scores table
CREATE TABLE public.readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.job_roles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  status TEXT CHECK (status IN ('not_ready', 'partially_ready', 'job_ready')),
  missing_skills TEXT[],
  weak_skills TEXT[],
  strong_skills TEXT[],
  ai_feedback TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('job_eligible', 'skill_gap', 'new_job', 'readiness_update', 'recommendation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create resumes table for storing analyzed resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  extracted_skills TEXT[],
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  target_job_id UUID REFERENCES public.job_roles(id),
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table for admin access (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Skills policies (public read, admin write)
CREATE POLICY "Anyone can view skills" ON public.skills
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage skills" ON public.skills
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Job roles policies (public read, admin write)
CREATE POLICY "Anyone can view active job roles" ON public.job_roles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage job roles" ON public.job_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Job skills policies
CREATE POLICY "Anyone can view job skills" ON public.job_skills
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage job skills" ON public.job_skills
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Student skills policies
CREATE POLICY "Users can view their own skills" ON public.student_skills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills" ON public.student_skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all student skills" ON public.student_skills
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Readiness scores policies
CREATE POLICY "Users can view their own scores" ON public.readiness_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own scores" ON public.readiness_scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all scores" ON public.readiness_scores
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Alerts policies
CREATE POLICY "Users can view their own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create alerts for users" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resumes policies
CREATE POLICY "Users can view their own resumes" ON public.resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own resumes" ON public.resumes
  FOR ALL USING (auth.uid() = user_id);

-- User roles policies (admin only)
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_student_skills_updated_at
  BEFORE UPDATE ON public.student_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for resumes
CREATE POLICY "Users can upload their own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);