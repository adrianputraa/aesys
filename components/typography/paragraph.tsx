import { cn } from '@/lib/utils';
interface Props extends React.AnchorHTMLAttributes<HTMLParagraphElement> {}
export default function ParagraphText({ ...props }: Props) {
  const { children, className, ...restOfProps } = props;
  return (
    <p {...restOfProps} className={cn('leading-7 not-first:mt-6', className)}>
      {children}
    </p>
  );
}
