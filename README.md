
# Academic Connect

Academic Connect is a modern, web-based platform designed to streamline academic processes and enhance collaboration between students, faculty, and administrators within an educational institution. It provides a centralized hub for managing student profiles, academic records, project submissions, MOOC certifications, and more.

## Tech Stack

The application is built with a modern, robust technology stack:

*   **Frontend:**
    *   **Next.js (v15+):** React framework for server-side rendering, static site generation, and a streamlined developer experience using the App Router.
    *   **React (v18+):** JavaScript library for building user interfaces.
    *   **TypeScript:** Superset of JavaScript that adds static typing for improved code quality and maintainability.
    *   **ShadCN UI:** Re-usable UI components built with Radix UI and Tailwind CSS, designed for accessibility and customization.
    *   **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
    *   **Lucide React:** Library for beautiful and consistent icons.
*   **Backend & Database:**
    *   **Next.js API Routes / Server Actions:** Used for handling backend logic and data mutations.
    *   **MongoDB:** NoSQL document database used for storing application data.
    *   **Mongoose (or native MongoDB driver):** For interacting with the MongoDB database.
*   **AI Functionality (Optional/If Applicable):**
    *   **Genkit (by Google):** Toolkit for building AI-powered features, potentially for content generation, summarization, or other AI tasks.
*   **File Storage:**
    *   **Cloudinary:** Cloud-based service for managing and delivering images and other media files (like PDF certificates and project reports).
*   **Authentication & Authorization:**
    *   Custom implementation using Next.js server actions and context API for managing user sessions and roles.
*   **Development Tools:**
    *   **npm/yarn:** Package management.
    *   **ESLint/Prettier:** Code linting and formatting.

## User Roles and Responsibilities

Academic Connect defines three primary user roles: Student, Faculty, and Admin.

### 1. Student

Students are the primary consumers of academic information and submitters of academic work.

**Key Features & Responsibilities:**

*   **Dashboard:** Personalized overview of academic activities and quick links.
*   **Profile Management:** View and update personal details (contact, address, guardian info, academic history). Core academic details (USN, department, semester, section) are view-only.
*   **My Marks:** View internal assessment (IA) and assignment marks for different semesters. Includes a visual chart for IA performance.
*   **My Projects:**
    *   Submit mini-project proposals for the current semester, including title, description, subject, and selecting a faculty guide.
    *   Upload PPT and report files (PDF format) after project approval.
    *   Track the status of project submissions (Pending, Approved, Rejected).
    *   Edit details of pending/rejected projects or upload files for approved projects (only for the current semester).
    *   View faculty remarks on submissions.
    *   Delete pending/rejected project submissions from the current semester.
*   **My MOOCs:**
    *   Submit Massive Open Online Course (MOOC) details for the current semester, including course name, platform, duration, and credits earned.
    *   Upload MOOC completion certificates (PDF format).
    *   Track the status of MOOC submissions (Pending, Approved, Rejected).
    *   Edit details of pending/rejected MOOCs (only for the current semester).
    *   View faculty remarks on submissions.
    *   Delete pending/rejected MOOC submissions from the current semester.

### 2. Faculty

Faculty members are responsible for teaching, evaluating students, approving academic submissions, and managing student academic progress within their assigned classes or coordination roles.

**Key Features & Responsibilities:**

*   **Dashboard:** Overview of faculty-specific tasks and quick links.
*   **Student Lookup:**
    *   Search for any active student by name or USN.
    *   View detailed student profiles, including academic, personal, contact, guardian, and academic history information.
    *   View a student's marks for any selected semester.
*   **Marks Entry:**
    *   Select semester, section, and one of their assigned subjects.
    *   View a list of active students enrolled in that class.
    *   Enter/update Internal Assessment (IA1, IA2) and Assignment marks for students.
    *   Manually add student rows for marks entry (requires USN and Name for saving).
    *   View a summary of average marks for the selected class and subject.
*   **Class Performance:**
    *   Select department, semester, and section.
    *   View a consolidated table of IA1 and IA2 marks for all students in the selected class across all subjects defined for that class by the Admin.
    *   See a summary of passed/failed counts per subject based on IA totals.
*   **Performance Analysis (Advanced):**
    *   Select semester, section, and one oftheir assigned subjects.
    *   View detailed performance statistics:
        *   Average scores for IAs and assignments.
        *   Pass percentages for IAs and assignments.
        *   Counts of high and low performers.
        *   Marks distribution charts for each assessment type (IA1, IA2, Assignments).
*   **Approvals:**
    *   **Project Approvals:**
        *   View pending mini-project proposals.
        *   Approve or reject project proposals *only if they are the assigned guide for that project*.
        *   Provide remarks for the decision.
    *   **MOOC Approvals:**
        *   View pending MOOC submissions.
        *   Approve or reject MOOC submissions *only if they are the MOOC Coordinator for the student's submission semester*.
        *   Provide remarks for the decision.
*   **Project Repository:**
    *   Browse all approved mini-projects across the institution.
    *   Search projects by title, student name, guide name, or subject.
    *   Download PPT and report files for approved projects.
*   **MOOC Repository:**
    *   Browse all approved MOOC submissions for the semesters they coordinate.
    *   Search MOOCs by course name, student name, platform, or semester.
    *   Download certificates for approved MOOCs.
*   **Profile Management:** View and update their own basic profile information.

### 3. Admin

Administrators have oversight of the entire system, manage user accounts, define academic structures, and ensure the smooth operation of the platform.

**Key Features & Responsibilities:**

*   **Dashboard:** Overview of administrative tasks and system statistics (if implemented).
*   **User Management:**
    *   View a list of all users (Students, Faculty, Admins) with filters for status (All, Pending, Active, Rejected, Disabled).
    *   Approve pending student and faculty registrations.
        *   When approving a student, assign their unique Admission ID (USN).
    *   Activate, reject, or disable user accounts.
    *   Edit core academic details for students (Department, Year, Current Semester, Section) via a dedicated modal.
*   **Subject Management:**
    *   Define and manage the official list of subjects offered by the institution.
    *   For each subject, specify: Department, Semester, Subject Code, Subject Name, and Credits.
    *   Add new subjects and delete existing ones. This list is used for faculty assignments and class performance views.
*   **Assignments:**
    *   **Faculty-Subject Assignments:**
        *   Assign faculty members to teach specific subjects for a given department, semester, and section.
        *   The list of available subjects is dynamically populated from the "Subject Management" section.
        *   View and delete existing faculty-subject assignments.
    *   **MOOC Coordinator Assignments:**
        *   Assign one faculty member per semester to be the MOOC Coordinator responsible for approving MOOC submissions for students in that semester.
        *   View and update/remove existing MOOC coordinator assignments.
*   **Profile Management:** View and update their own basic profile information.

## Setup and Running

1.  **Prerequisites:**
    *   Node.js (v18 or later recommended)
    *   npm or yarn
    *   MongoDB instance (local or cloud-hosted, e.g., MongoDB Atlas)
    *   Cloudinary account (for file uploads)

2.  **Environment Variables:**
    *   Create a `.env.local` file in the root of the project.
    *   Add the following environment variables:
        ```
        MONGODB_URI=<your_mongodb_connection_string>
        MONGODB_DB_NAME=<your_database_name>

        CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
        CLOUDINARY_API_KEY=<your_cloudinary_api_key>
        CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

        # Optional: For Genkit AI features if used
        # GOOGLE_API_KEY=<your_google_ai_api_key>
        ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Seed Database (Optional but Recommended for Initial Setup):**
    The project includes a seeding script to populate the database with initial admin, faculty, and student users, as well as some sample data.
    *   Review and modify `src/lib/seed.ts` if necessary.
    *   Run the seed script:
        ```bash
        npm run seed:db
        # or
        yarn seed:db
        ```
    *   The hardcoded admin login is `admin@gmail.com` / `password` if you use the default seed or the bypass in `auth-actions.ts`. Other seeded users are `teststudent@gmail.com` / `password` and `testfaculty@example.com` / `password`.

5.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:9002`.

6.  **Build for Production:**
    ```bash
    npm run build
    npm run start
    # or
    yarn build
    yarn start
    ```

## Future Enhancements (Potential)

*   Attendance Tracking
*   Event Calendar and Notifications
*   Direct Messaging / Announcements
*   More detailed analytics and reporting
*   Integration with other institutional systems

---

This README provides a comprehensive guide to the Academic Connect platform.
