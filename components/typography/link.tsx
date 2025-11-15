import { cn } from '@/lib/utils';
import NextLink, { type LinkProps } from 'next/link';

interface Props extends LinkProps {
  children: React.ReactNode;
  className?: string;
}
export default function LinkText({ ...props }: Props) {
  const { children, className, ...restProps } = props;
  return (
    <NextLink {...restProps} className={cn('text-blue-600 hover:text-blue-500 hover:underline', className)}>
      {children}
    </NextLink>
  );
}
