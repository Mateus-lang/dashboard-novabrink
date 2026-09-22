import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
interface headerProps {
  title: string;
  subtitle?: string;
  // lista, e não um link só: com dashboard, detalhes e nova coleta, cada
  // página precisa apontar pras outras duas
  links: { label: string; href: string }[];
}
const Header = ({
  title,
  subtitle,
  links,
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
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Header;
