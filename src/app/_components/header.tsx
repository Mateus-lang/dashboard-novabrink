import Image from "next/image";

const Header = () => {
  return (
    <div className="">
      <div>
        <Image
          src="/logo-nvbrnk.png"
          alt="logo novabrink"
        />
        <h1>Monitoramento de Preços | E-commerce</h1>
      </div>
    </div>
  );
};

export default Header;
