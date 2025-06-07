
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowRight, Users, FileText as FileTextIconLucide, BookOpen as BookOpenIconLucide, Briefcase as BriefcaseIconLucide, Settings2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// SVG Icons for features to match the style better
const UsersIcon = () => <Users className="h-6 w-6 text-primary" />;
const ClipboardCheckIcon = () => <ClipboardCheck className="h-6 w-6 text-primary" />;
const FileTextIcon = () => <FileTextIconLucide className="h-6 w-6 text-primary" />;
const BookOpenIcon = () => <BookOpenIconLucide className="h-6 w-6 text-primary" />;
const BriefcaseIcon = () => <BriefcaseIconLucide className="h-6 w-6 text-primary" />;
const SettingsIcon = () => <Settings2 className="h-6 w-6 text-primary" />;


const FloatingElement = ({ src, alt, className, size = 100, hint }: { src: string; alt: string; className: string; size?: number; hint?: string }) => (
  <div className={`absolute ${className} opacity-70 animate-float-slow`}>
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      data-ai-hint={hint || "abstract shape"}
    />
  </div>
);

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-gray-100 overflow-x-hidden">
      <header className="absolute top-0 z-50 w-full">
        <div className="container mx-auto flex h-20 items-center px-4 md:px-6">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <GraduationCap className="h-7 w-7 text-white" />
              <span className="font-bold text-xl text-white">
                Academic Connect
              </span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="secondary" className="bg-white text-indigo-700 hover:bg-gray-200 font-semibold">
              <Link href="/login">
                Login <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full min-h-screen flex items-center justify-center pt-20 pb-12 md:pt-24 md:pb-24 lg:pt-32 lg:pb-32 xl:pt-48 xl:pb-48 overflow-hidden bg-gradient-to-br from-indigo-800 via-purple-900 to-slate-900">
          {/* Floating Decorative Elements */}
          <FloatingElement src="https://placehold.co/120x120/8B5CF6/FFFFFF.png?text=AC1" alt="Abstract shape 1" className="top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" size={80} hint="abstract blob" />
          <FloatingElement src="https://placehold.co/150x150/EC4899/FFFFFF.png?text=AC2" alt="Abstract shape 2" className="bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 animate-float-slow-delay" size={100} hint="abstract swirl" />
          <FloatingElement src="https://placehold.co/80x80/F59E0B/FFFFFF.png?text=AC3" alt="Abstract shape 3" className="top-1/2 right-10 -translate-y-1/2 animate-float-slow" size={60} hint="abstract star" />
           <FloatingElement src="https://placehold.co/100x100/10B981/FFFFFF.png?text=AC4" alt="Abstract shape 4" className="bottom-10 left-10 animate-float-slow-delay" size={70} hint="abstract circle" />


          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
              <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl md:text-6xl xl:text-7xl/none">
                    Unlock Your Academic Potential.
                  </h1>
                  <p className="max-w-[600px] text-gray-300 md:text-xl mx-auto lg:mx-0">
                    Academic Connect: Streamlining student profiles, project submissions, and faculty collaboration for a seamless educational experience.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center lg:justify-start">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg" asChild>
                    <Link href="/login">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center items-center animate-float">
                <Image
                  alt="Academic Platform Illustration"
                  className="mx-auto aspect-[4/3] overflow-hidden rounded-xl object-cover shadow-2xl"
                  height="450"
                  src="https://placehold.co/600x450/3730A3/FFFFFF.png?text=Platform+View"
                  data-ai-hint="education technology collaboration"
                  width="600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-indigo-700 px-3 py-1 text-sm text-gray-100 font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">
                  Everything You Need, All in One Place
                </h2>
                <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Streamline student profiles, academic data, project submissions, and MOOC tracking with our intuitive platform.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none pt-12">
              {[
                { title: "Student Profiles", description: "Comprehensive student information at your fingertips.", icon: <UsersIcon /> },
                { title: "Academic Records", description: "Track marks, attendance, and progress effortlessly.", icon: <ClipboardCheckIcon /> },
                { title: "Project Submissions", description: "Manage mini-projects with ease, from submission to approval.", icon: <FileTextIcon /> },
                { title: "MOOC Tracking", description: "Oversee MOOC enrollments and certificate submissions.", icon: <BookOpenIcon /> },
                { title: "Faculty Tools", description: "Empowering faculty with efficient data entry and approval workflows.", icon: <BriefcaseIcon /> },
                { title: "Admin Dashboard", description: "Centralized control and user management for administrators.", icon: <SettingsIcon /> },
              ].map((feature) => (
                <Card key={feature.title} className="bg-slate-700 border-slate-600 text-gray-200 shadow-lg hover:shadow-indigo-500/30 transition-shadow duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <span className="p-3 bg-primary/20 rounded-lg text-primary">{feature.icon}</span>
                      <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-slate-700">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Academic Connect. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-gray-400 hover:text-gray-200" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-gray-400 hover:text-gray-200" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
