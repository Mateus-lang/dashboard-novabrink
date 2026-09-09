import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
interface headerProps {
  title: string;
  subtitle?: string;
  linkTitle: string;
  navigate: string;
}
const Header = ({
  title,
  subtitle,
  linkTitle,
  navigate,
}: headerProps) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <div>
        <Image
          src="/logo-nvbrnk.png"
          alt="logo novabrink"
          width={322}
          height={150}
          priority
          className="h-20 w-auto"
        />
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={navigate}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkTitle}
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Header;
