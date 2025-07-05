# CodeMap Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- [ ] Supabase project set up
- [ ] Environment variables configured
- [ ] Domain name ready (optional)
- [ ] CI/CD pipeline tested

### 1. Supabase Setup

#### Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations:
   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE,
     name TEXT,
     email TEXT UNIQUE,
     role TEXT DEFAULT 'student',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     PRIMARY KEY (id)
   );

   -- Create classrooms table
   CREATE TABLE classrooms (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Create concept_maps table
   CREATE TABLE concept_maps (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
     map_data JSONB NOT NULL DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Create project_submissions table
   CREATE TABLE project_submissions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
     file_name TEXT NOT NULL,
     file_storage_path TEXT NOT NULL,
     status TEXT DEFAULT 'uploaded',
     user_goals TEXT,
     concept_map_id UUID REFERENCES concept_maps(id) ON DELETE SET NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
   );

   -- Create classroom_students junction table
   CREATE TABLE classroom_students (
     classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
     student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
     PRIMARY KEY (classroom_id, student_id)
   );
   ```

#### Storage Setup
1. Create a storage bucket named `project_archives`
2. Set up RLS policies for secure file access

#### Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Classrooms policies
CREATE POLICY "Teachers can manage own classrooms" ON classrooms FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view enrolled classrooms" ON classrooms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classroom_students 
    WHERE classroom_id = classrooms.id AND student_id = auth.uid()
  )
);

-- Add more policies as needed...
```

### 2. Environment Configuration

#### Production Environment Variables
Create a `.env.production` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com
```

### 3. Deployment Options

#### Option A: Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Option B: Netlify
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Configure environment variables

#### Option C: Docker Deployment
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### 4. Post-Deployment Verification

#### Health Checks
- [ ] Application loads successfully
- [ ] User registration/login works
- [ ] Concept map creation works
- [ ] Project upload and analysis works
- [ ] All API endpoints respond correctly

#### Performance Checks
- [ ] Page load times < 3 seconds
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Mobile responsiveness verified

#### Security Checks
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] RLS policies working
- [ ] No sensitive data exposed

### 5. Monitoring and Maintenance

#### Recommended Tools
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics or Vercel Analytics
- **Uptime Monitoring**: UptimeRobot
- **Performance**: Vercel Speed Insights

#### Regular Maintenance
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Review and update RLS policies

### 6. Scaling Considerations

#### Database Optimization
- Add indexes for frequently queried columns
- Implement connection pooling
- Consider read replicas for high traffic

#### Application Optimization
- Enable Next.js Image Optimization
- Implement caching strategies
- Use CDN for static assets
- Consider serverless functions for AI processing

### 7. Troubleshooting

#### Common Issues
1. **Build Failures**: Check environment variables and dependencies
2. **Database Connection**: Verify Supabase URL and keys
3. **AI Features Not Working**: Check Google AI API key
4. **File Upload Issues**: Verify storage bucket configuration

#### Debug Commands
```bash
# Check build locally
npm run build

# Test production build
npm run start

# Run integration tests
node tmp_rovodev_integration_test_runner.js

# Check environment
npm run typecheck
```

---

## 🎯 Quick Deployment Commands

```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm run test

# 3. Build for production
npm run build

# 4. Start production server
npm run start
```

For detailed troubleshooting, see the main README.md file.