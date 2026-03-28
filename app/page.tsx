import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DollarSign,
  Users,
  Calculator,
  FolderKanban,
  UserCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: DollarSign,
    title: "Finance Management",
    description:
      "Streamline your financial operations with comprehensive accounting, budgeting, and reporting tools.",
  },
  {
    icon: Users,
    title: "Human Resources",
    description:
      "Manage employee data, recruitment, performance reviews, and workforce planning efficiently.",
  },
  {
    icon: Calculator,
    title: "Payroll Processing",
    description:
      "Automate payroll calculations, tax deductions, and ensure timely salary disbursements.",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Plan, track, and collaborate on projects with powerful task management and timeline tools.",
  },
  {
    icon: UserCheck,
    title: "Customer Relations",
    description:
      "Build stronger customer relationships with CRM tools for sales, support, and engagement.",
  },
]

const benefits = [
  "All-in-one integrated platform",
  "Real-time analytics and reporting",
  "Secure and scalable infrastructure",
  "24/7 customer support",
  "Customizable workflows",
  "Mobile-friendly interface",
]

export default function Page() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container flex flex-col items-center text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Enterprise Resource Planning
              <span className="block text-primary">Simplified</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              A comprehensive ERP solution that integrates finance, human
              resources, payroll, project management, and customer relations
              into one powerful platform.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Run Your Business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful modules designed to work seamlessly together, giving you
              complete control over your operations.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-t bg-muted/50 py-20 md:py-32">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
            <div className="flex flex-col justify-center space-y-6">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why Choose Aesys?
              </h2>
              <p className="text-lg text-muted-foreground">
                Built for modern businesses, Aesys provides the tools you need
                to streamline operations, improve efficiency, and drive growth.
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative aspect-square w-full max-w-md rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-8">
                <div className="absolute inset-0 rounded-2xl border bg-background/50 backdrop-blur-sm" />
                <div className="relative flex h-full flex-col items-center justify-center space-y-4 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <DollarSign className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Start Today</h3>
                  <p className="text-muted-foreground">
                    Join thousands of businesses already using Aesys to
                    transform their operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Transform Your Business?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sign up today and experience the power of integrated enterprise
              management.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/sign-in">Sign In to Your Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aesys. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Enterprise Resource Planning Solution
          </p>
        </div>
      </footer>
    </div>
  )
}
