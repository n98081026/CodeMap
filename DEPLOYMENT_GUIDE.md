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

#### Application Environment Variables (to be set in Vercel and optionally locally)

These variables are required by the Next.js application itself. When deploying to Vercel, **these must be set in your Vercel project's Environment Variables settings.**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # For backend operations if any
GOOGLE_AI_API_KEY=your_google_ai_api_key # For Genkit/AI features
# NEXTAUTH_SECRET=your_nextauth_secret # If using NextAuth.js
# NEXTAUTH_URL=https://your-domain.com # If using NextAuth.js
```
*For local development, you can create a `.env.local` file in the project root and place these variables there.*

### 3. Deployment Options

#### Option A: Vercel (Recommended for this project)

Vercel is the recommended platform for deploying this Next.js application. You have two main approaches:

1.  **Vercel for GitHub (Automatic Git Integration)**:
    *   Connect your GitHub repository to your Vercel project via the Vercel dashboard.
    *   Vercel will automatically build and deploy your project upon pushes to the configured production branch (e.g., `main`) and generate preview deployments for other branches/PRs.
    *   Ensure all **Application Environment Variables** (listed in section 2) are configured in your Vercel project settings (Dashboard > Project > Settings > Environment Variables).

2.  **GitHub Actions CI/CD with Vercel CLI (Advanced Control)**:
    *   This project's `.github/workflows/ci.yml` file is pre-configured to use this method. It provides more control over the build and test process before deploying via Vercel CLI.
    *   To use this method, you need to:
        *   **Disable Vercel's automatic Git deployments** for this project if you previously enabled them, to avoid double deployments.
        *   Set the **Application Environment Variables** in your Vercel project settings as described above.
        *   Configure the **GitHub Repository Secrets** listed in the next section.

### GitHub Actions CI/CD with Vercel CLI: Required Secrets

If you are using the Vercel CLI deployment method via GitHub Actions (as configured in `.github/workflows/ci.yml`), you must set the following secrets in your GitHub repository (Settings > Secrets and variables > Actions > Repository secrets > New repository secret).

**Core Vercel CLI Secrets:**

1.  **`VERCEL_TOKEN`**:
    *   **Purpose**: Allows GitHub Actions to authenticate with your Vercel account and manage deployments using the Vercel CLI.
    *   **How to obtain**: Create an Access Token from your Vercel account settings ([https://vercel.com/account/tokens](https://vercel.com/account/tokens)).
2.  **`VERCEL_ORG_ID`**:
    *   **Purpose**: Identifies your Vercel organization or personal account.
    *   **How to obtain**: After linking your local project (`vercel link`), find this in the generated `.vercel/project.json` file.
3.  **`VERCEL_PROJECT_ID`**:
    *   **Purpose**: Identifies the specific Vercel project.
    *   **How to obtain**: Also found in `.vercel/project.json` after `vercel link`.

**Application & CI Build Secrets:**

These secrets are needed by various CI jobs (like `test`, `build-app`, `e2e-test`) or might be required during the `npm run build` process if not solely handled by `vercel build` pulling from Vercel's environment. It's generally recommended to have these in GitHub Secrets for CI consistency and also configured in Vercel Project Settings for runtime.

4.  **`NEXT_PUBLIC_SUPABASE_URL`**:
    *   **Purpose**: Supabase project URL, used by the application at build time and runtime.
    *   **Source**: Your Supabase project settings.
5.  **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
    *   **Purpose**: Supabase anonymous key, used by the application at build time and runtime.
    *   **Source**: Your Supabase project settings.
6.  **`GOOGLE_AI_API_KEY`**:
    *   **Purpose**: API key for Google AI services (Genkit), potentially used at build time or runtime.
    *   **Source**: Your Google Cloud project / AI service credentials.
7.  **`E2E_TEST_USER_EMAIL`**:
    *   **Purpose**: Email address for the test user account used in E2E tests (Playwright `global.setup.ts`).
    *   **Source**: Define a dedicated test user in your authentication system.
8.  **`E2E_TEST_USER_PASSWORD`**:
    *   **Purpose**: Password for the E2E test user account.
    *   **Source**: Password for the dedicated test user.

**Important Note on Environment Variables:**
*   **Vercel Project Settings**: All variables required for the application to *run* correctly after deployment (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) **MUST** be configured in your Vercel project's Environment Variables settings (Dashboard > Project > Settings > Environment Variables). The `vercel pull` command in the CI workflow fetches these for `vercel build`.
*   **GitHub Secrets**: The secrets listed above are used by the GitHub Actions workflow itself, either to authenticate with Vercel CLI or to provide build-time/test-time configuration to steps like `npm run build` or `npm run test:e2e`.

With these GitHub secrets and the Vercel project environment variables configured, the CI pipeline (including E2E tests) will run, and the `deploy-staging` (for the `develop` branch) and `deploy-production` (for the `main` branch) jobs will deploy your application.

### Verifying Deployments (Staging Example)

The CI/CD pipeline automatically deploys to staging when changes are merged/pushed to the `develop` branch. Here's how to verify:

1.  **Trigger Deployment**: Merge your feature branch into `develop` and push to remote.
    ```bash
    git checkout develop
    git pull origin develop
    git merge your-feature-branch
    git push origin develop
    ```
2.  **Monitor GitHub Actions**:
    *   Go to the "Actions" tab in your GitHub repository.
    *   Observe the workflow run. Ensure all jobs (`test`, `build-app`, `e2e-test`, `deploy-staging`) pass.
    *   Check the `deploy-staging` job logs for the Vercel preview URL.
3.  **Check Vercel Dashboard**:
    *   Log in to Vercel and navigate to your project.
    *   Confirm a new deployment for the `develop` branch is "Ready".
    *   Note the deployment URL.
4.  **Access Staging URL**:
    *   Open the preview URL in your browser.
5.  **Manual Verification**:
    *   Perform key user flows (login, map creation, AI features).
    *   Check browser console for errors.
    *   Ensure connection to correct backend services.
6.  **Troubleshooting**:
    *   Start with GitHub Actions logs for failures in tests or `npm run build`.
    *   For Vercel-specific build or deployment issues, check Vercel's build logs.
    *   For runtime issues on the deployed app, check Vercel's function logs.

Production deployments to `main` follow a similar verification process.

#### Option B: Netlify
(This section remains as is)
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Configure environment variables

#### Option C: Docker Deployment
(This section remains as is)
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
(This section remains as is)

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
(This section remains as is)

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
(This section remains as is)

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
(This section remains as is)

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
(This section remains as is)

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
