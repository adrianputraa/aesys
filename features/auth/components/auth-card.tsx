import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Shared shell for the auth pages: a centered card with a title, description,
 * the form, and an optional footer (e.g. a help note).
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {children}
        {footer ? (
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
